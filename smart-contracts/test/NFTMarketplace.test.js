const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Marketplace", function () {
    let nftCollection, marketplace;
    let owner, seller, buyer, bidder1, bidder2;

    beforeEach(async function () {
        [owner, seller, buyer, bidder1, bidder2] = await ethers.getSigners();

        // Deploy NFT Collection
        const NFTCollection = await ethers.getContractFactory("NFTCollection");
        nftCollection = await NFTCollection.deploy();
        await nftCollection.deployed();

        // Deploy Marketplace
        const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
        marketplace = await NFTMarketplace.deploy();
        await marketplace.deployed();
    });

    describe("NFT Collection", function () {
        it("Should mint NFT correctly", async function () {
            const tokenURI = "https://test-metadata.json";
            const royalty = 250; // 2.5%

            await nftCollection.connect(seller).mintNFT(
                seller.address,
                tokenURI,
                royalty
            );

            expect(await nftCollection.ownerOf(1)).to.equal(seller.address);
            expect(await nftCollection.tokenURI(1)).to.equal(tokenURI);

            const [creator, royaltyAmount] = await nftCollection.getRoyaltyInfo(1);
            expect(creator).to.equal(seller.address);
            expect(royaltyAmount).to.equal(royalty);
        });

        it("Should reject royalty higher than 10%", async function () {
            await expect(
                nftCollection.connect(seller).mintNFT(
                    seller.address,
                    "https://test-metadata.json",
                    1001 // 10.01%
                )
            ).to.be.revertedWith("Royalty too high");
        });

        it("Should increment token IDs correctly", async function () {
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata1.json",
                250
            );

            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata2.json",
                300
            );

            expect(await nftCollection.getCurrentTokenId()).to.equal(2);
        });
    });

    describe("Marketplace - Fixed Price Listings", function () {
        beforeEach(async function () {
            // Mint an NFT for testing
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );
        });

        it("Should list NFT for fixed price", async function () {
            const price = ethers.utils.parseEther("1");

            // Approve marketplace
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);

            // List NFT
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false, // not auction
                0
            );

            const listing = await marketplace.listings(1);
            expect(listing.active).to.be.true;
            expect(listing.price).to.equal(price);
            expect(listing.seller).to.equal(seller.address);
            expect(listing.isAuction).to.be.false;
        });

        it("Should reject listing without approval", async function () {
            const price = ethers.utils.parseEther("1");

            await expect(
                marketplace.connect(seller).listItem(
                    nftCollection.address,
                    1,
                    price,
                    false,
                    0
                )
            ).to.be.revertedWith("Not approved");
        });

        it("Should reject listing by non-owner", async function () {
            const price = ethers.utils.parseEther("1");

            await expect(
                marketplace.connect(buyer).listItem(
                    nftCollection.address,
                    1,
                    price,
                    false,
                    0
                )
            ).to.be.revertedWith("Not owner");
        });

        it("Should buy NFT successfully", async function () {
            const price = ethers.utils.parseEther("1");

            // List NFT
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false,
                0
            );

            // Get initial balances
            const sellerBalanceBefore = await seller.getBalance();

            // Buy NFT
            await marketplace.connect(buyer).buyItem(1, {
                value: price
            });

            // Check ownership transfer
            expect(await nftCollection.ownerOf(1)).to.equal(buyer.address);

            // Check listing is inactive
            const listing = await marketplace.listings(1);
            expect(listing.active).to.be.false;

            // Check seller received payment (minus gas)
            const sellerBalanceAfter = await seller.getBalance();
            const marketplaceFee = price.mul(250).div(10000); // 2.5%
            const expectedSellerPayment = price.sub(marketplaceFee);

            expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(expectedSellerPayment);
        });

        it("Should reject insufficient payment", async function () {
            const price = ethers.utils.parseEther("1");
            const insufficientPayment = ethers.utils.parseEther("0.5");

            // List NFT
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false,
                0
            );

            await expect(
                marketplace.connect(buyer).buyItem(1, {
                    value: insufficientPayment
                })
            ).to.be.revertedWith("Insufficient payment");
        });

        it("Should reject buying own item", async function () {
            const price = ethers.utils.parseEther("1");

            // List NFT
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false,
                0
            );

            await expect(
                marketplace.connect(seller).buyItem(1, {
                    value: price
                })
            ).to.be.revertedWith("Cannot buy your own item");
        });
    });

    describe("Marketplace - Auction Listings", function () {
        beforeEach(async function () {
            // Mint an NFT for testing
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );
        });

        it("Should list NFT for auction", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const auctionDuration = 86400; // 24 hours

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);

            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true, // is auction
                auctionDuration
            );

            const listing = await marketplace.listings(1);
            expect(listing.active).to.be.true;
            expect(listing.price).to.equal(startingPrice);
            expect(listing.isAuction).to.be.true;
            expect(listing.auctionEndTime).to.be.gt(0);
        });

        it("Should place bid successfully", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bidAmount = ethers.utils.parseEther("1");
            const auctionDuration = 86400;

            // List NFT for auction
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            // Place bid
            await marketplace.connect(bidder1).placeBid(1, {
                value: bidAmount
            });

            const listing = await marketplace.listings(1);
            expect(listing.highestBidder).to.equal(bidder1.address);
            expect(listing.highestBid).to.equal(bidAmount);
        });

        it("Should handle multiple bids and refund previous bidders", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bid1 = ethers.utils.parseEther("1");
            const bid2 = ethers.utils.parseEther("1.5");
            const auctionDuration = 86400;

            // List NFT for auction
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            // Get initial balance of bidder1
            const bidder1BalanceBefore = await bidder1.getBalance();

            // Place first bid
            const tx1 = await marketplace.connect(bidder1).placeBid(1, {
                value: bid1
            });
            const receipt1 = await tx1.wait();
            const gasCost1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice);

            // Place higher bid
            await marketplace.connect(bidder2).placeBid(1, {
                value: bid2
            });

            // Check bidder1 was refunded
            const bidder1BalanceAfter = await bidder1.getBalance();
            expect(bidder1BalanceAfter).to.equal(
                bidder1BalanceBefore.sub(gasCost1) // Should be refunded the bid amount
            );

            // Check bidder2 is highest bidder
            const listing = await marketplace.listings(1);
            expect(listing.highestBidder).to.equal(bidder2.address);
            expect(listing.highestBid).to.equal(bid2);
        });

        it("Should reject bid lower than current highest", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bid1 = ethers.utils.parseEther("1");
            const bid2 = ethers.utils.parseEther("0.8");
            const auctionDuration = 86400;

            // List and place first bid
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            await marketplace.connect(bidder1).placeBid(1, {
                value: bid1
            });

            // Try to place lower bid
            await expect(
                marketplace.connect(bidder2).placeBid(1, {
                    value: bid2
                })
            ).to.be.revertedWith("Bid too low");
        });

        it("Should end auction and transfer NFT to highest bidder", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bidAmount = ethers.utils.parseEther("1");
            const auctionDuration = 1; // 1 second for testing

            // List NFT for auction
            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            // Place bid
            await marketplace.connect(bidder1).placeBid(1, {
                value: bidAmount
            });

            // Wait for auction to end
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get seller balance before
            const sellerBalanceBefore = await seller.getBalance();

            // End auction
            const tx = await marketplace.connect(owner).endAuction(1);
            await tx.wait();

            // Check NFT ownership
            expect(await nftCollection.ownerOf(1)).to.equal(bidder1.address);

            // Check listing is inactive
            const listing = await marketplace.listings(1);
            expect(listing.active).to.be.false;

            // Check seller received payment
            const sellerBalanceAfter = await seller.getBalance();
            const marketplaceFee = bidAmount.mul(250).div(10000); // 2.5%
            const expectedSellerPayment = bidAmount.sub(marketplaceFee);

            expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(expectedSellerPayment);
        });

        it("Should reject ending auction before time", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const auctionDuration = 86400; // 24 hours

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            await expect(
                marketplace.connect(owner).endAuction(1)
            ).to.be.revertedWith("Auction still active");
        });

        it("Should reject bidding on own auction", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bidAmount = ethers.utils.parseEther("1");
            const auctionDuration = 86400;

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                auctionDuration
            );

            await expect(
                marketplace.connect(seller).placeBid(1, {
                    value: bidAmount
                })
            ).to.be.revertedWith("Cannot bid on your own item");
        });
    });

    describe("Marketplace - Administration", function () {
        it("Should allow owner to set marketplace fee", async function () {
            const newFee = 500; // 5%

            await marketplace.connect(owner).setMarketplaceFee(newFee);
            expect(await marketplace.marketplaceFee()).to.equal(newFee);
        });

        it("Should reject fee higher than 10%", async function () {
            const invalidFee = 1001; // 10.01%

            await expect(
                marketplace.connect(owner).setMarketplaceFee(invalidFee)
            ).to.be.revertedWith("Fee too high");
        });

        it("Should reject non-owner setting fee", async function () {
            const newFee = 500;

            await expect(
                marketplace.connect(seller).setMarketplaceFee(newFee)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow cancelling listing", async function () {
            const price = ethers.utils.parseEther("1");

            // Mint and list NFT
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false,
                0
            );

            // Cancel listing
            await marketplace.connect(seller).cancelListing(1);

            const listing = await marketplace.listings(1);
            expect(listing.active).to.be.false;
        });
    });

    describe("Events", function () {
        it("Should emit NFTMinted event", async function () {
            const tokenURI = "https://test-metadata.json";

            await expect(
                nftCollection.connect(seller).mintNFT(
                    seller.address,
                    tokenURI,
                    250
                )
            ).to.emit(nftCollection, "NFTMinted")
             .withArgs(1, seller.address, tokenURI);
        });

        it("Should emit ItemListed event", async function () {
            const price = ethers.utils.parseEther("1");

            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);

            await expect(
                marketplace.connect(seller).listItem(
                    nftCollection.address,
                    1,
                    price,
                    false,
                    0
                )
            ).to.emit(marketplace, "ItemListed")
             .withArgs(1, nftCollection.address, 1, price);
        });

        it("Should emit ItemSold event", async function () {
            const price = ethers.utils.parseEther("1");

            // Setup
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                price,
                false,
                0
            );

            // Buy and check event
            await expect(
                marketplace.connect(buyer).buyItem(1, {
                    value: price
                })
            ).to.emit(marketplace, "ItemSold")
             .withArgs(1, buyer.address, price);
        });

        it("Should emit BidPlaced event", async function () {
            const startingPrice = ethers.utils.parseEther("0.5");
            const bidAmount = ethers.utils.parseEther("1");

            // Setup auction
            await nftCollection.connect(seller).mintNFT(
                seller.address,
                "https://test-metadata.json",
                250
            );

            await nftCollection.connect(seller).setApprovalForAll(marketplace.address, true);
            await marketplace.connect(seller).listItem(
                nftCollection.address,
                1,
                startingPrice,
                true,
                86400
            );

            // Place bid and check event
            await expect(
                marketplace.connect(bidder1).placeBid(1, {
                    value: bidAmount
                })
            ).to.emit(marketplace, "BidPlaced")
             .withArgs(1, bidder1.address, bidAmount);
        });
    });
});