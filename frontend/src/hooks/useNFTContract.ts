'use client';

import { useContract, useProvider, useSigner, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useState } from 'react';

// Import contract ABIs and addresses
// Note: These will be available after deployment
let NFTCollectionABI: any;
let MarketplaceABI: any;
let addresses: any;

try {
    NFTCollectionABI = require('../contracts/NFTCollection.json');
    MarketplaceABI = require('../contracts/NFTMarketplace.json');
    addresses = require('../contracts/addresses.json');
} catch (error) {
    console.warn('Contract artifacts not found. Please deploy contracts first.');
}

export const useNFTContract = () => {
    const provider = useProvider();
    const { data: signer } = useSigner();
    const { address } = useAccount();
    const [loading, setLoading] = useState(false);

    const nftContract = useContract({
        address: addresses?.nftCollection,
        abi: NFTCollectionABI?.abi,
        signerOrProvider: signer || provider
    });

    const marketplaceContract = useContract({
        address: addresses?.marketplace,
        abi: MarketplaceABI?.abi,
        signerOrProvider: signer || provider
    });

    const mintNFT = async (tokenURI: string, royalty: number = 250) => {
        if (!signer || !address) {
            throw new Error('Wallet not connected');
        }
        if (!nftContract) {
            throw new Error('Contract not available');
        }

        setLoading(true);
        try {
            const tx = await nftContract.mintNFT(address, tokenURI, royalty);
            const receipt = await tx.wait();

            // Get the token ID from the event
            const event = receipt.events?.find((e: any) => e.event === 'NFTMinted');
            const tokenId = event?.args?.tokenId?.toNumber();

            return { receipt, tokenId };
        } finally {
            setLoading(false);
        }
    };

    const listNFT = async (
        tokenId: number,
        price: string,
        isAuction: boolean = false,
        auctionDuration: number = 86400 // 24 hours
    ) => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }
        if (!nftContract || !marketplaceContract) {
            throw new Error('Contracts not available');
        }

        setLoading(true);
        try {
            // First check if marketplace is already approved
            const isApproved = await nftContract.isApprovedForAll(address, addresses.marketplace);

            if (!isApproved) {
                // Approve marketplace to transfer NFTs
                const approveTx = await nftContract.setApprovalForAll(addresses.marketplace, true);
                await approveTx.wait();
            }

            // List the item
            const listTx = await marketplaceContract.listItem(
                addresses.nftCollection,
                tokenId,
                ethers.utils.parseEther(price),
                isAuction,
                auctionDuration
            );

            return await listTx.wait();
        } finally {
            setLoading(false);
        }
    };

    const buyNFT = async (listingId: number, price: string) => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }
        if (!marketplaceContract) {
            throw new Error('Contract not available');
        }

        setLoading(true);
        try {
            const tx = await marketplaceContract.buyItem(listingId, {
                value: ethers.utils.parseEther(price)
            });

            return await tx.wait();
        } finally {
            setLoading(false);
        }
    };

    const placeBid = async (listingId: number, bidAmount: string) => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }
        if (!marketplaceContract) {
            throw new Error('Contract not available');
        }

        setLoading(true);
        try {
            const tx = await marketplaceContract.placeBid(listingId, {
                value: ethers.utils.parseEther(bidAmount)
            });

            return await tx.wait();
        } finally {
            setLoading(false);
        }
    };

    const endAuction = async (listingId: number) => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }
        if (!marketplaceContract) {
            throw new Error('Contract not available');
        }

        setLoading(true);
        try {
            const tx = await marketplaceContract.endAuction(listingId);
            return await tx.wait();
        } finally {
            setLoading(false);
        }
    };

    const getOwnedNFTs = async () => {
        if (!address || !nftContract) {
            return [];
        }

        try {
            // Get current token count
            const tokenCount = await nftContract.getCurrentTokenId();
            const ownedTokens = [];

            // Check each token for ownership
            for (let i = 1; i <= tokenCount.toNumber(); i++) {
                try {
                    const owner = await nftContract.ownerOf(i);
                    if (owner.toLowerCase() === address.toLowerCase()) {
                        const tokenURI = await nftContract.tokenURI(i);
                        const royaltyInfo = await nftContract.getRoyaltyInfo(i);

                        ownedTokens.push({
                            tokenId: i,
                            tokenURI,
                            creator: royaltyInfo[0],
                            royalty: royaltyInfo[1].toNumber()
                        });
                    }
                } catch (error) {
                    // Token might not exist or might be burned
                    continue;
                }
            }

            return ownedTokens;
        } catch (error) {
            console.error('Error fetching owned NFTs:', error);
            return [];
        }
    };

    const getActiveListings = async () => {
        if (!marketplaceContract) {
            return [];
        }

        try {
            const listingCounter = await marketplaceContract.listingCounter();
            const activeListings = [];

            for (let i = 1; i <= listingCounter.toNumber(); i++) {
                try {
                    const listing = await marketplaceContract.listings(i);
                    if (listing.active) {
                        activeListings.push({
                            id: i,
                            ...listing,
                            price: ethers.utils.formatEther(listing.price),
                            highestBid: ethers.utils.formatEther(listing.highestBid)
                        });
                    }
                } catch (error) {
                    continue;
                }
            }

            return activeListings;
        } catch (error) {
            console.error('Error fetching active listings:', error);
            return [];
        }
    };

    return {
        nftContract,
        marketplaceContract,
        mintNFT,
        listNFT,
        buyNFT,
        placeBid,
        endAuction,
        getOwnedNFTs,
        getActiveListings,
        loading,
        isContractsAvailable: !!addresses && !!NFTCollectionABI && !!MarketplaceABI
    };
};