// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        uint256 tokenId;
        address nftContract;
        address seller;
        uint256 price;
        bool active;
        bool isAuction;
        uint256 auctionEndTime;
        address highestBidder;
        uint256 highestBid;
    }

    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public tokenToListingId;

    uint256 public listingCounter;
    uint256 public marketplaceFee = 250; // 2.5%

    event ItemListed(uint256 indexed listingId, address indexed nftContract, uint256 indexed tokenId, uint256 price);
    event ItemSold(uint256 indexed listingId, address buyer, uint256 price);
    event BidPlaced(uint256 indexed listingId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed listingId, address winner, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        bool isAuction,
        uint256 auctionDuration
    ) external {
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(nft.isApprovedForAll(msg.sender, address(this)), "Not approved");
        require(price > 0, "Price must be greater than 0");

        listingCounter++;

        listings[listingCounter] = Listing({
            tokenId: tokenId,
            nftContract: nftContract,
            seller: msg.sender,
            price: price,
            active: true,
            isAuction: isAuction,
            auctionEndTime: isAuction ? block.timestamp + auctionDuration : 0,
            highestBidder: address(0),
            highestBid: 0
        });

        tokenToListingId[nftContract][tokenId] = listingCounter;

        emit ItemListed(listingCounter, nftContract, tokenId, price);
    }

    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(!listing.isAuction, "Item is auction");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy your own item");

        listing.active = false;

        // Calculate fees and royalties
        uint256 marketplaceFeeAmount = (msg.value * marketplaceFee) / 10000;
        uint256 sellerAmount = msg.value - marketplaceFeeAmount;

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Transfer payments
        payable(listing.seller).transfer(sellerAmount);

        emit ItemSold(listingId, msg.sender, msg.value);
    }

    function placeBid(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp < listing.auctionEndTime, "Auction ended");
        require(msg.value > listing.highestBid, "Bid too low");
        require(msg.sender != listing.seller, "Cannot bid on your own item");

        // Refund previous bidder
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }

        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;

        emit BidPlaced(listingId, msg.sender, msg.value);
    }

    function endAuction(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.isAuction, "Not an auction");
        require(block.timestamp >= listing.auctionEndTime, "Auction still active");

        listing.active = false;

        if (listing.highestBidder != address(0)) {
            // Calculate fees
            uint256 marketplaceFeeAmount = (listing.highestBid * marketplaceFee) / 10000;
            uint256 sellerAmount = listing.highestBid - marketplaceFeeAmount;

            // Transfer NFT to winner
            IERC721(listing.nftContract).safeTransferFrom(
                listing.seller,
                listing.highestBidder,
                listing.tokenId
            );

            // Transfer payment to seller
            payable(listing.seller).transfer(sellerAmount);

            emit ItemSold(listingId, listing.highestBidder, listing.highestBid);
        }

        emit AuctionEnded(listingId, listing.highestBidder, listing.highestBid);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(msg.sender == listing.seller || msg.sender == owner(), "Not authorized");

        if (listing.isAuction && listing.highestBidder != address(0)) {
            // Refund highest bidder
            payable(listing.highestBidder).transfer(listing.highestBid);
        }

        listing.active = false;
    }

    function getActiveListing(uint256 listingId) external view returns (Listing memory) {
        require(listings[listingId].active, "Listing not active");
        return listings[listingId];
    }

    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _fee;
    }

    function withdrawFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}