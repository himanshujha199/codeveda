// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CarbonMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 id;
        address seller;
        uint256 tokenId;
        uint256 amount;     // whole bundle
        uint256 priceWei;   // total price (ETH)
        bool active;
    }

    IERC1155 public immutable carbon;
    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed id, address indexed seller, uint256 tokenId, uint256 amount, uint256 priceWei);
    event Bought(uint256 indexed id, address indexed buyer);
    event Cancelled(uint256 indexed id);

    constructor(IERC1155 _carbon) {
        carbon = _carbon;
    }

    function list(uint256 tokenId, uint256 amount, uint256 priceWei) external nonReentrant returns (uint256 id) {
        require(amount > 0, "amount=0");
        require(priceWei > 0, "price=0");
        // transfer will fail if user hasn't approved or lacks balance; that's okay
        id = nextListingId++;
        listings[id] = Listing(id, msg.sender, tokenId, amount, priceWei, true);
        emit Listed(id, msg.sender, tokenId, amount, priceWei);
    }

    function buy(uint256 id) external payable nonReentrant {
        Listing storage l = listings[id];
        require(l.active, "inactive");
        require(msg.value == l.priceWei, "wrong value");
        l.active = false;

        // send ETH to seller
        (bool ok, ) = payable(l.seller).call{value: msg.value}("");
        require(ok, "eth xfer failed");

        // transfer credits to buyer
        carbon.safeTransferFrom(l.seller, msg.sender, l.tokenId, l.amount, "");
        emit Bought(id, msg.sender);
    }

    function cancel(uint256 id) external nonReentrant {
        Listing storage l = listings[id];
        require(l.active, "inactive");
        require(l.seller == msg.sender, "not seller");
        l.active = false;
        emit Cancelled(id);
    }

    function activeListings(uint256 startId, uint256 maxCount) external view returns (Listing[] memory out) {
        uint256 end = nextListingId;
        if (startId < 1) startId = 1;
        uint256 n;
        for (uint256 i = startId; i < end && n < maxCount; i++) {
            if (listings[i].active) n++;
        }
        out = new Listing[](n);
        uint256 j;
        for (uint256 i = startId; i < end && j < n; i++) {
            if (listings[i].active) out[j++] = listings[i];
        }
    }
}
