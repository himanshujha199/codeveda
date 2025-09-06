// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CarbonCredit1155.sol"; // uses AccessControl + mint/balanceOf/hasRole

contract GreenFunding {
    CarbonCredit1155 public carbon;

    struct Proposal {
        uint256 id;
        address owner;
        string title;
        string metadataURI;
        uint256 goal;        // wei
        uint256 deadline;    // ts
        bool approved;
        bool withdrawn;
        uint256 raised;      // wei
        uint256 projectTokenId;
        bool distributed;
        uint256 assignedCredits; // total credits to distribute when goal is hit
        bool rejected;            // NEW
    }

    uint256 public nextId = 1;
    mapping(uint256 => Proposal) public proposals;

    // contributions & funder list
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public funders;
    mapping(uint256 => mapping(address => bool)) public isFunder;

    // rejection reason (optional)
    mapping(uint256 => string) public rejectionReason; // NEW

    event ProposalCreated(uint256 indexed id, address indexed owner, string title, uint256 goal, uint256 deadline);
    event Approved(uint256 indexed id, uint256 tokenId, uint256 credits);
    event Rejected(uint256 indexed id, string reason); // NEW
    event Funded(uint256 indexed id, address indexed from, uint256 amount);
    event Distributed(uint256 indexed id, uint256 totalCredits);
    event Withdrawn(uint256 indexed id, address indexed to, uint256 amount);
    event Refunded(uint256 indexed id, address indexed to, uint256 amount);

    constructor(CarbonCredit1155 _carbon) {
        carbon = _carbon;
    }

    // --- util ---
    function _isRegulator(address a) internal view returns (bool) {
        return carbon.hasRole(carbon.VERIFIER_ROLE(), a)
            || carbon.hasRole(carbon.DEFAULT_ADMIN_ROLE(), a);
    }

    // --- lifecycle ---
    function create(string memory title, string memory meta, uint256 goalWei, uint256 durationDays) external {
        require(goalWei > 0, "goal=0");
        require(durationDays > 0, "dur=0");
        uint256 id = nextId++;
        proposals[id] = Proposal({
            id: id,
            owner: msg.sender,
            title: title,
            metadataURI: meta,
            goal: goalWei,
            deadline: block.timestamp + durationDays * 1 days,
            approved: false,
            withdrawn: false,
            raised: 0,
            projectTokenId: 0,
            distributed: false,
            assignedCredits: 0,
            rejected: false // NEW
        });
        emit ProposalCreated(id, msg.sender, title, goalWei, block.timestamp + durationDays * 1 days);
    }

    /// Regulator approves AND assigns project token + credits pool.
    function approve(uint256 id, uint256 tokenId, uint256 credits) external {
        require(_isRegulator(msg.sender), "not regulator");
        Proposal storage p = proposals[id];
        require(p.id != 0, "bad id");
        require(!p.approved, "already approved");
        require(!p.rejected, "already rejected"); // NEW
        require(credits > 0, "credits=0");
        require(tokenId != 0, "tokenId=0");

        p.approved = true;
        p.projectTokenId = tokenId;
        p.assignedCredits = credits;

        emit Approved(id, tokenId, credits);
    }

    /// Regulator rejects a proposal with a reason.
    function reject(uint256 id, string calldata reason) external { // NEW
        require(_isRegulator(msg.sender), "not regulator");
        Proposal storage p = proposals[id];
        require(p.id != 0, "bad id");
        require(!p.approved, "already approved");
        require(!p.rejected, "already rejected");

        p.rejected = true;
        // Store reason (optional)
        if (bytes(reason).length > 0) {
            rejectionReason[id] = reason;
        } else {
            rejectionReason[id] = "rejected";
        }

        emit Rejected(id, rejectionReason[id]);
    }

    // --- funding ---
    function fund(uint256 id) external payable {
        Proposal storage p = proposals[id];
        require(p.id != 0, "bad id");
        require(p.approved, "not approved");
        require(!p.rejected, "rejected"); // NEW (defense in depth)
        require(block.timestamp < p.deadline, "ended");
        require(msg.value > 0, "no eth");
        require(msg.sender != p.owner, "owner");
        require(!_isRegulator(msg.sender), "regulator");

        // prevent over-funding; revert if exceeding remaining
        uint256 remaining = p.goal - p.raised;
        require(msg.value <= remaining, "exceeds goal");

        p.raised += msg.value;
        contributions[id][msg.sender] += msg.value;
        if (!isFunder[id][msg.sender]) {
            isFunder[id][msg.sender] = true;
            funders[id].push(msg.sender);
        }
        emit Funded(id, msg.sender, msg.value);

        // auto-distribute when goal hit (only once)
        if (p.raised == p.goal && !p.distributed) {
            _distribute(id);
        }
    }

    function _distribute(uint256 id) internal {
        Proposal storage p = proposals[id];
        require(p.assignedCredits > 0, "no credits");
        require(p.projectTokenId != 0, "no token");
        address[] storage list = funders[id];
        require(list.length > 0, "no funders");

        uint256 totalCredits = p.assignedCredits;
        uint256 minted = 0;

        // distribute pro-rata (floor), give remainder to last funder
        for (uint256 i = 0; i < list.length; i++) {
            address a = list[i];
            uint256 cWei = contributions[id][a];
            if (cWei == 0) continue;
            uint256 share = (totalCredits * cWei) / p.goal;
            if (i == list.length - 1) {
                // give remainder to last
                share = totalCredits - minted;
            }
            if (share > 0) {
                carbon.mint(a, p.projectTokenId, share, "");
                minted += share;
            }
        }
        p.distributed = true;
        emit Distributed(id, totalCredits);
    }

    // --- cash flows ---
    function withdraw(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.id != 0, "bad id");
        require(msg.sender == p.owner, "not owner");
        // allow withdraw when goal reached (success), distribution already done
        require(p.raised == p.goal, "not success");
        require(!p.withdrawn, "done");

        p.withdrawn = true;
        uint256 amt = p.raised;
        (bool ok, ) = payable(p.owner).call{value: amt}("");
        require(ok, "transfer failed");
        emit Withdrawn(id, p.owner, amt);
    }

    function refund(uint256 id) external {
        Proposal storage p = proposals[id];
        require(p.id != 0, "bad id");
        require(block.timestamp >= p.deadline, "not ended");
        require(p.raised < p.goal, "not failed");

        uint256 amt = contributions[id][msg.sender];
        require(amt > 0, "zero");
        contributions[id][msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amt}("");
        require(ok, "refund failed");
        emit Refunded(id, msg.sender, amt);
    }

    // --- views (optional helpers for UI) ---
    function fundersCount(uint256 id) external view returns (uint256) { // NEW
        return funders[id].length;
    }
}
