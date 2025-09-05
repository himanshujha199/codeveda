// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {CarbonCredit1155} from "./CarbonCredit1155.sol";

contract GreenFunding is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    CarbonCredit1155 public immutable carbon;

    struct Proposal {
        uint256 id;
        address owner;          // project owner
        string  title;
        string  metadataURI;
        uint256 goal;           // target ETH
        uint256 deadline;       // block timestamp limit
        bool    approved;       // regulator approved
        bool    withdrawn;      // ETH withdrawn by owner (if successful)
        uint256 raised;         // total ETH raised
        uint256 projectTokenId; // credits bucket for distribution (0 until set)
        bool    distributed;    // credits sent to investors
    }

    uint256 public nextId = 1;
    mapping(uint256 => Proposal) public proposals;

    // contribution tracking for pro-rata distribution
    mapping(uint256 => address[]) public contributors;            // proposalId -> list
    mapping(uint256 => mapping(address => uint256)) public amount; // proposalId -> addr -> ETH

    event Created(uint256 indexed id, address indexed owner);
    event Approved(uint256 indexed id);
    event Funded(uint256 indexed id, address indexed from, uint256 value);
    event Withdrawn(uint256 indexed id, uint256 value);
    event Refunded(uint256 indexed id, address indexed to, uint256 value);
    event ProjectLinked(uint256 indexed id, uint256 tokenId);
    event Distributed(uint256 indexed id, uint256 totalCredits);

    constructor(CarbonCredit1155 _carbon) {
        carbon = _carbon;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function create(
        string calldata title,
        string calldata metadataURI,
        uint256 goalWei,
        uint256 durationDays
    ) external returns (uint256 id) {
        require(goalWei > 0 && durationDays > 0, "bad params");
        id = nextId++;
        proposals[id] = Proposal({
            id: id,
            owner: msg.sender,
            title: title,
            metadataURI: metadataURI,
            goal: goalWei,
            deadline: block.timestamp + durationDays * 1 days,
            approved: false,
            withdrawn: false,
            raised: 0,
            projectTokenId: 0,
            distributed: false
        });
        emit Created(id, msg.sender);
    }

    function approve(uint256 id) external onlyRole(VERIFIER_ROLE) {
        Proposal storage p = proposals[id];
        require(!p.approved, "already");
        p.approved = true;
        emit Approved(id);
    }

    function fund(uint256 id) external payable nonReentrant {
        Proposal storage p = proposals[id];
        require(p.approved, "not approved");
        require(block.timestamp < p.deadline, "ended");
        require(msg.value > 0, "zero");
        if (amount[id][msg.sender] == 0) {
            contributors[id].push(msg.sender);
        }
        amount[id][msg.sender] += msg.value;
        p.raised += msg.value;
        emit Funded(id, msg.sender, msg.value);
    }

    function withdraw(uint256 id) external nonReentrant {
        Proposal storage p = proposals[id];
        require(msg.sender == p.owner, "not owner");
        require(block.timestamp >= p.deadline, "not ended");
        require(p.raised >= p.goal, "goal not met");
        require(!p.withdrawn, "already");
        p.withdrawn = true;
        (bool ok, ) = payable(p.owner).call{value: p.raised}("");
        require(ok, "eth xfer failed");
        emit Withdrawn(id, p.raised);
    }

    function refund(uint256 id) external nonReentrant {
        Proposal storage p = proposals[id];
        require(block.timestamp >= p.deadline, "not ended");
        require(p.raised < p.goal, "goal met");
        uint256 a = amount[id][msg.sender];
        require(a > 0, "no contrib");
        amount[id][msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: a}("");
        require(ok, "refund failed");
        emit Refunded(id, msg.sender, a);
    }

    /** Link the funded proposal to an existing carbon project (tokenId). Regulator only. */
    function setProject(uint256 id, uint256 tokenId) external onlyRole(VERIFIER_ROLE) {
        Proposal storage p = proposals[id];
        require(p.approved, "not approved");
        require(p.projectTokenId == 0, "already set");
        p.projectTokenId = tokenId;
        emit ProjectLinked(id, tokenId);
    }

    /**
     * After project completion is verified, distribute credits to all investors pro-rata.
     * This contract must have VERIFIER_ROLE on CarbonCredit1155 to mint.
     */
    function distributeCredits(uint256 id, uint256 totalCredits) external onlyRole(VERIFIER_ROLE) {
        Proposal storage p = proposals[id];
        require(p.projectTokenId != 0, "no project");
        require(block.timestamp >= p.deadline, "not ended");
        require(p.raised >= p.goal, "goal not met");
        require(!p.distributed, "already");
        require(totalCredits > 0, "zero");

        address[] storage addrs = contributors[id];
        uint256 n = addrs.length;
        require(n > 0, "no investors");

        uint256 mintedTotal;
        for (uint256 i = 0; i < n; i++) {
            address addr = addrs[i];
            uint256 paid = amount[id][addr];
            if (paid == 0) continue;
            uint256 share = (paid * totalCredits) / p.raised; // floor
            if (share > 0) {
                carbon.mint(addr, p.projectTokenId, share, "");
                mintedTotal += share;
            }
        }

        // send any rounding leftovers to the project owner (optional policy)
        if (mintedTotal < totalCredits) {
            carbon.mint(p.owner, p.projectTokenId, totalCredits - mintedTotal, "");
            mintedTotal = totalCredits;
        }

        p.distributed = true;
        emit Distributed(id, mintedTotal);
    }
}
