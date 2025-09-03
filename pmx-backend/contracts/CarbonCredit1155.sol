// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * CarbonCredit1155
 * - Each project/vintage is a tokenId
 * - VERIFIER_ROLE can create projects and mint credits (up to a capped supply)
 * - Holders can retire (burn) credits; total retired tracked per id
 */
contract CarbonCredit1155 is ERC1155, ERC1155Supply, AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    string public name = "Power Matrix Carbon Credit";
    string public symbol = "PMCC";

    struct Project {
        uint16 vintageYear;
        uint256 cap;         // max credits that can ever be minted
        string metadataURI;  // ipfs://... or https://...
        bool exists;
        uint256 retired;     // total retired so far
    }

    uint256 private _nextId = 1;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => string) private _uris; // per-ID URI

    event ProjectCreated(uint256 indexed id, uint16 vintageYear, uint256 cap, string uri);
    event Retired(address indexed by, uint256 indexed id, uint256 amount, uint256 when);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender); // deployer is first verifier
    }

    function createProject(uint16 vintageYear, uint256 cap, string memory metadataURI)
        external onlyRole(VERIFIER_ROLE) returns (uint256 id)
    {
        require(cap > 0, "cap=0");
        id = _nextId++;
        projects[id] = Project({
            vintageYear: vintageYear,
            cap: cap,
            metadataURI: metadataURI,
            exists: true,
            retired: 0
        });
        _uris[id] = metadataURI;
        emit ProjectCreated(id, vintageYear, cap, metadataURI);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }

    // Verifier mints up to project cap after reviewing evidence/estimate
    function mint(address to, uint256 id, uint256 amount, bytes memory data)
        external onlyRole(VERIFIER_ROLE)
    {
        Project storage p = projects[id];
        require(p.exists, "no project");
        require(totalSupply(id) + amount <= p.cap, "cap exceeded");
        _mint(to, id, amount, data);
    }

    // Any holder can retire (burn) credits; tracked on-chain
    function retire(uint256 id, uint256 amount) external nonReentrant {
        _burn(msg.sender, id, amount);
        projects[id].retired += amount;
        emit Retired(msg.sender, id, amount, block.timestamp);
    }

    // ---- Required overrides (OZ v4) ----
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
