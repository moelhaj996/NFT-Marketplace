'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNFTContract } from '../hooks/useNFTContract';

interface NFTListing {
    id: number;
    tokenId: number;
    name: string;
    description: string;
    image: string;
    price: string;
    seller: string;
    isAuction: boolean;
    auctionEndTime?: number;
    highestBid?: string;
    highestBidder?: string;
}

interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{trait_type: string, value: string}>;
}

export default function NFTGrid() {
    const [listings, setListings] = useState<NFTListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { marketplaceContract, nftContract, buyNFT, placeBid, endAuction, loading: contractLoading, isContractsAvailable } = useNFTContract();

    useEffect(() => {
        if (isContractsAvailable) {
            loadListings();
        }
    }, [isContractsAvailable]);

    const loadListings = async () => {
        if (!marketplaceContract || !nftContract) {
            setLoading(false);
            return;
        }

        setRefreshing(true);
        try {
            // Get listing counter
            const listingCounter = await marketplaceContract.listingCounter();
            const activeListings: NFTListing[] = [];

            for (let i = 1; i <= listingCounter.toNumber(); i++) {
                try {
                    const listing = await marketplaceContract.listings(i);

                    if (listing.active) {
                        // Get token URI and metadata
                        const tokenURI = await nftContract.tokenURI(listing.tokenId);

                        // Fetch metadata from IPFS
                        let metadata: NFTMetadata;
                        try {
                            const response = await fetch(tokenURI);
                            metadata = await response.json();
                        } catch (metadataError) {
                            console.warn(`Failed to fetch metadata for token ${listing.tokenId}:`, metadataError);
                            metadata = {
                                name: `NFT #${listing.tokenId}`,
                                description: 'Metadata unavailable',
                                image: '/placeholder-nft.png'
                            };
                        }

                        activeListings.push({
                            id: i,
                            tokenId: listing.tokenId.toNumber(),
                            name: metadata.name || `NFT #${listing.tokenId}`,
                            description: metadata.description || '',
                            image: metadata.image || '/placeholder-nft.png',
                            price: ethers.utils.formatEther(listing.price),
                            seller: listing.seller,
                            isAuction: listing.isAuction,
                            auctionEndTime: listing.auctionEndTime?.toNumber(),
                            highestBid: ethers.utils.formatEther(listing.highestBid || 0),
                            highestBidder: listing.highestBidder
                        });
                    }
                } catch (error) {
                    console.warn(`Error loading listing ${i}:`, error);
                    continue;
                }
            }

            setListings(activeListings.reverse()); // Show newest first
        } catch (error) {
            console.error('Error loading listings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleBuyNFT = async (listingId: number, price: string) => {
        try {
            await buyNFT(listingId, price);
            alert('NFT purchased successfully!');
            loadListings(); // Refresh listings
        } catch (error) {
            console.error('Error buying NFT:', error);
            alert(`Error buying NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handlePlaceBid = async (listingId: number) => {
        const bidAmount = prompt('Enter your bid amount in ETH:');
        if (!bidAmount || isNaN(Number(bidAmount))) {
            alert('Please enter a valid bid amount');
            return;
        }

        try {
            await placeBid(listingId, bidAmount);
            alert('Bid placed successfully!');
            loadListings(); // Refresh listings
        } catch (error) {
            console.error('Error placing bid:', error);
            alert(`Error placing bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleEndAuction = async (listingId: number) => {
        try {
            await endAuction(listingId);
            alert('Auction ended successfully!');
            loadListings(); // Refresh listings
        } catch (error) {
            console.error('Error ending auction:', error);
            alert(`Error ending auction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const formatTimeRemaining = (endTime: number) => {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = endTime - now;

        if (timeLeft <= 0) return 'Auction ended';

        const days = Math.floor(timeLeft / 86400);
        const hours = Math.floor((timeLeft % 86400) / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const isAuctionEnded = (endTime?: number) => {
        if (!endTime) return false;
        return Math.floor(Date.now() / 1000) >= endTime;
    };

    if (!isContractsAvailable) {
        return (
            <div className="text-center p-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-yellow-800 mb-2">Contracts Not Available</h2>
                    <p className="text-yellow-700">
                        Smart contracts have not been deployed yet. Please deploy the contracts first.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (listings.length === 0) {
        return (
            <div className="text-center p-8">
                <div className="bg-gray-50 rounded-lg p-8">
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No NFTs Listed</h3>
                    <p className="text-gray-500">Be the first to list an NFT for sale!</p>
                    <button
                        onClick={loadListings}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Marketplace</h2>
                <button
                    onClick={loadListings}
                    disabled={refreshing}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listings.map((listing) => (
                    <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                        {/* Image */}
                        <div className="aspect-square overflow-hidden">
                            <img
                                src={listing.image}
                                alt={listing.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-nft.png';
                                }}
                            />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <h3 className="text-lg font-bold mb-2 truncate">{listing.name}</h3>

                            {listing.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                    {listing.description}
                                </p>
                            )}

                            {/* Price/Bid Info */}
                            <div className="mb-4">
                                {listing.isAuction ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Starting bid</span>
                                            <span className="font-bold">{listing.price} ETH</span>
                                        </div>

                                        {listing.highestBid && parseFloat(listing.highestBid) > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Highest bid</span>
                                                <span className="font-bold text-green-600">{listing.highestBid} ETH</span>
                                            </div>
                                        )}

                                        {listing.auctionEndTime && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Time left</span>
                                                <span className={`text-sm font-medium ${isAuctionEnded(listing.auctionEndTime) ? 'text-red-600' : 'text-orange-600'}`}>
                                                    {formatTimeRemaining(listing.auctionEndTime)}
                                                </span>
                                            </div>
                                        )}

                                        <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                                            Auction
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Price</span>
                                        <span className="text-xl font-bold">{listing.price} ETH</span>
                                    </div>
                                )}
                            </div>

                            {/* Seller */}
                            <div className="mb-4">
                                <p className="text-xs text-gray-500">
                                    Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                                </p>
                            </div>

                            {/* Action Button */}
                            <div className="space-y-2">
                                {listing.isAuction ? (
                                    <>
                                        {isAuctionEnded(listing.auctionEndTime) ? (
                                            <button
                                                onClick={() => handleEndAuction(listing.id)}
                                                disabled={contractLoading}
                                                className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                End Auction
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePlaceBid(listing.id)}
                                                disabled={contractLoading}
                                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Place Bid
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleBuyNFT(listing.id, listing.price)}
                                        disabled={contractLoading}
                                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {contractLoading ? 'Processing...' : 'Buy Now'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}