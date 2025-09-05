// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CarbonCredit1155} from "./CarbonCredit1155.sol";

contract CarbonClaims is AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    CarbonCredit1155 public immutable carbon;

    enum Status { Pending, Approved, Rejected }

    struct Claim {
        address claimant;
        uint256 tokenId;      // 0 if asking for a new project
        uint16  vintageYear;  // used if creating a new project
        uint256 cap;          // used if creating a new project
        string  metadataURI;  // used if creating a new project
        uint256 requested;    // requested credits
        bytes32 evidenceHash; // hash of user evidence bundle
        Status  status;
        string  note;
    }

    uint256 public nextClaimId = 1;
    mapping(uint256 => Claim) public claims;

    event Submitted(uint256 indexed id, address indexed claimant);
    event Approved(uint256 indexed id, uint256 mintedToTokenId, address beneficiary, uint256 amount);
    event Rejected(uint256 indexed id, string reason);

    constructor(CarbonCredit1155 _carbon) {
        carbon = _carbon;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    // Claim under an existing project
    function submitExisting(uint256 tokenId, uint256 requested, bytes32 evHash) external returns (uint256 id) {
        require(requested > 0, "requested=0");
        id = nextClaimId++;
        claims[id] = Claim(msg.sender, tokenId, 0, 0, "", requested, evHash, Status.Pending, "");
        emit Submitted(id, msg.sender);
    }

    // Ask to create a new project, then mint
    function submitNewProject(
        uint16 vintageYear,
        uint256 cap,
        string calldata metadataURI,
        uint256 requested,
        bytes32 evHash
    ) external returns (uint256 id) {
        require(cap > 0 && requested > 0, "bad params");
        id = nextClaimId++;
        claims[id] = Claim(msg.sender, 0, vintageYear, cap, metadataURI, requested, evHash, Status.Pending, "");
        emit Submitted(id, msg.sender);
    }

    // Regulator approves → optionally creates project → mints credits
    function approve(uint256 id, address beneficiary, uint256 amount, string calldata note)
        external
        onlyRole(VERIFIER_ROLE)
    {
        Claim storage c = claims[id];
        require(c.status == Status.Pending, "not pending");
        require(amount > 0 && amount <= c.requested, "bad amount");

        uint256 tokenId = c.tokenId;
        if (tokenId == 0) {
            // create project first
            tokenId = carbon.createProject(c.vintageYear, c.cap, c.metadataURI);
            c.tokenId = tokenId;
        }
        c.status = Status.Approved;
        c.note = note;

        // Claims contract must have VERIFIER_ROLE on Carbon to mint
        carbon.mint(beneficiary, tokenId, amount, "");
        emit Approved(id, tokenId, beneficiary, amount);
    }

    function reject(uint256 id, string calldata reason) external onlyRole(VERIFIER_ROLE) {
        Claim storage c = claims[id];
        require(c.status == Status.Pending, "not pending");
        c.status = Status.Rejected;
        c.note = reason;
        emit Rejected(id, reason);
    }

    function getClaim(uint256 id) external view returns (Claim memory) {
        return claims[id];
    }
}
