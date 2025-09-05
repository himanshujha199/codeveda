// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract CarbonCredit1155 is ERC1155, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    struct Project {
        uint16 vintageYear;
        uint256 cap;       // max credits ever
        string metadataURI;
        bool active;
        uint256 retired;   // total retired (global)
        uint256 minted;    // total minted (to enforce cap)
    }

    uint256 public nextProjectId = 1;
    mapping(uint256 => Project) public projects;

    event ProjectCreated(uint256 indexed id, uint16 vintage, uint256 cap, string uri);
    event Retired(address indexed user, uint256 indexed id, uint256 amount, string memo);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender); // deployer acts as regulator by default
    }

    /** Per-project URI */
    function uri(uint256 id) public view override returns (string memory) {
        return projects[id].metadataURI;
    }

    /** Create a new credit bucket (project). Regulator only. */
    function createProject(
        uint16 vintageYear,
        uint256 cap,
        string memory metadataURI
    ) external onlyRole(VERIFIER_ROLE) returns (uint256 id) {
        require(cap > 0, "cap=0");
        id = nextProjectId++;
        projects[id] = Project({
            vintageYear: vintageYear,
            cap: cap,
            metadataURI: metadataURI,
            active: true,
            retired: 0,
            minted: 0
        });
        emit ProjectCreated(id, vintageYear, cap, metadataURI);
    }

    /** Mint credits into a wallet for a project. Regulator only. */
    function mint(address to, uint256 id, uint256 amount, bytes memory data)
        external
        onlyRole(VERIFIER_ROLE)
    {
        Project storage p = projects[id];
        require(p.active, "inactive");
        require(amount > 0, "amount=0");
        require(p.minted + amount <= p.cap, "cap exceeded");
        p.minted += amount;
        _mint(to, id, amount, data);
    }

    /** User burns (retires) their credits; cannot be resold. */
    function retire(uint256 id, uint256 amount) external {
        require(amount > 0, "amount=0");
        _burn(msg.sender, id, amount);
        projects[id].retired += amount;
        emit Retired(msg.sender, id, amount, "");
    }

    /** Optional: retire with a note for certificates */
    function retireWithNote(uint256 id, uint256 amount, string calldata memo) external {
        require(amount > 0, "amount=0");
        _burn(msg.sender, id, amount);
        projects[id].retired += amount;
        emit Retired(msg.sender, id, amount, memo);
    }
}
