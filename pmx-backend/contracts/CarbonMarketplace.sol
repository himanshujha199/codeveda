// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

interface ICarbon1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

contract CarbonMarketplace is ERC1155Holder, ReentrancyGuard {
    struct Listing {
        uint256 id;
        address seller;
        uint256 tokenId;
        uint256 amount;       // whole-lot amount
        uint256 priceWei;     // total price
        bool active;
    }

    ICarbon1155 public immutable token;
    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 tokenId, uint256 amount, uint256 priceWei);
    event Purchased(uint256 indexed listingId, address indexed buyer);
    event Cancelled(uint256 indexed listingId);

    constructor(address carbon1155) {
        token = ICarbon1155(carbon1155);
    }

    function list(uint256 tokenId, uint256 amount, uint256 priceWei) external nonReentrant {
        require(priceWei > 0 && amount > 0, "bad params");
        require(token.isApprovedForAll(msg.sender, address(this)), "approve first");
        token.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        uint256 id = nextListingId++;
        listings[id] = Listing(id, msg.sender, tokenId, amount, priceWei, true);
        emit Listed(id, msg.sender, tokenId, amount, priceWei);
    }

    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active, "inactive");
        require(msg.value == l.priceWei, "wrong value");

        l.active = false;
        token.safeTransferFrom(address(this), msg.sender, l.tokenId, l.amount, "");
        (bool ok, ) = payable(l.seller).call{value: msg.value}("");
        require(ok, "payout failed");

        emit Purchased(listingId, msg.sender);
    }

    function cancel(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active, "inactive");
        require(l.seller == msg.sender, "not seller");
        l.active = false;
        token.safeTransferFrom(address(this), msg.sender, l.tokenId, l.amount, "");
        emit Cancelled(listingId);
    }
}
