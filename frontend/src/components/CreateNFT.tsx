'use client';

import { useState } from 'react';
import { useNFTContract } from '../hooks/useNFTContract';
import { uploadToIPFS, uploadMetadata } from '../lib/ipfs';

interface CreateNFTProps {
    onSuccess?: (tokenId: number) => void;
}

export default function CreateNFT({ onSuccess }: CreateNFTProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [royalty, setRoyalty] = useState(250); // 2.5%
    const [attributes, setAttributes] = useState<{trait_type: string, value: string}[]>([]);
    const [newAttribute, setNewAttribute] = useState({trait_type: '', value: ''});
    const [isUploading, setIsUploading] = useState(false);

    const { mintNFT, loading, isContractsAvailable } = useNFTContract();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addAttribute = () => {
        if (newAttribute.trait_type && newAttribute.value) {
            setAttributes([...attributes, newAttribute]);
            setNewAttribute({trait_type: '', value: ''});
        }
    };

    const removeAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!image || !name || !description) {
            alert('Please fill in all required fields');
            return;
        }

        if (!isContractsAvailable) {
            alert('Contracts not deployed. Please deploy contracts first.');
            return;
        }

        setIsUploading(true);
        try {
            // Upload image to IPFS
            console.log('Uploading image to IPFS...');
            const imageURL = await uploadToIPFS(image);
            console.log('Image uploaded:', imageURL);

            // Create metadata
            const metadata = {
                name,
                description,
                image: imageURL,
                attributes: attributes.length > 0 ? attributes : undefined,
                external_url: '',
                background_color: '',
            };

            // Upload metadata to IPFS
            console.log('Uploading metadata to IPFS...');
            const metadataURL = await uploadMetadata(metadata);
            console.log('Metadata uploaded:', metadataURL);

            // Mint NFT
            console.log('Minting NFT...');
            const result = await mintNFT(metadataURL, royalty);
            console.log('NFT minted successfully:', result);

            // Reset form
            setName('');
            setDescription('');
            setImage(null);
            setImagePreview('');
            setRoyalty(250);
            setAttributes([]);

            if (onSuccess && result.tokenId) {
                onSuccess(result.tokenId);
            }

            alert(`NFT created successfully! Token ID: ${result.tokenId}`);
        } catch (error) {
            console.error('Error creating NFT:', error);
            alert(`Error creating NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isContractsAvailable) {
        return (
            <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">Contracts Not Available</h2>
                <p className="text-yellow-700">
                    Smart contracts have not been deployed yet. Please deploy the contracts first using the deployment script.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New NFT</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image *
                    </label>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover rounded-lg"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                                required
                            />
                        </label>
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter NFT name"
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your NFT"
                        required
                    />
                </div>

                {/* Royalty */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Royalty: {(royalty / 100).toFixed(1)}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1000"
                        value={royalty}
                        onChange={(e) => setRoyalty(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>10%</span>
                    </div>
                </div>

                {/* Attributes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attributes (Optional)
                    </label>

                    {/* Add new attribute */}
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            placeholder="Trait type (e.g., Color)"
                            value={newAttribute.trait_type}
                            onChange={(e) => setNewAttribute({...newAttribute, trait_type: e.target.value})}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                            type="text"
                            placeholder="Value (e.g., Blue)"
                            value={newAttribute.value}
                            onChange={(e) => setNewAttribute({...newAttribute, value: e.target.value})}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={addAttribute}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                        >
                            Add
                        </button>
                    </div>

                    {/* Display attributes */}
                    {attributes.length > 0 && (
                        <div className="space-y-2">
                            {attributes.map((attr, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span className="text-sm">
                                        <strong>{attr.trait_type}:</strong> {attr.value}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeAttribute(index)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || isUploading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isUploading ? 'Uploading to IPFS...' : loading ? 'Minting NFT...' : 'Create NFT'}
                </button>
            </form>

            {/* Helper text */}
            <div className="mt-4 text-sm text-gray-600">
                <p className="mb-2">
                    <strong>Note:</strong> Creating an NFT requires two transactions:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Upload image and metadata to IPFS</li>
                    <li>Mint the NFT on the blockchain</li>
                </ol>
            </div>
        </div>
    );
}