import { create as ipfsHttpClient } from 'ipfs-http-client';

// Create IPFS client - using public gateway for demo
// In production, use your own IPFS node or service like Pinata/Infura
const client = ipfsHttpClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID && process.env.NEXT_PUBLIC_INFURA_SECRET
            ? `Basic ${Buffer.from(
                `${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}:${process.env.NEXT_PUBLIC_INFURA_SECRET}`
            ).toString('base64')}`
            : undefined
    }
});

export const uploadToIPFS = async (file: File): Promise<string> => {
    try {
        const result = await client.add(file);
        return `https://ipfs.io/ipfs/${result.path}`;
    } catch (error) {
        console.error('IPFS upload error:', error);
        throw new Error('Failed to upload file to IPFS');
    }
};

export const uploadMetadata = async (metadata: object): Promise<string> => {
    try {
        const result = await client.add(JSON.stringify(metadata));
        return `https://ipfs.io/ipfs/${result.path}`;
    } catch (error) {
        console.error('IPFS metadata upload error:', error);
        throw new Error('Failed to upload metadata to IPFS');
    }
};

// Alternative: Use Pinata for more reliable IPFS service
export const uploadToPinata = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Pinata upload failed');
        }

        const result = await response.json();
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('Pinata upload error:', error);
        throw new Error('Failed to upload file to Pinata');
    }
};

export const uploadMetadataToPinata = async (metadata: object): Promise<string> => {
    try {
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
            },
            body: JSON.stringify({
                pinataContent: metadata,
                pinataMetadata: {
                    name: 'NFT Metadata'
                }
            })
        });

        if (!response.ok) {
            throw new Error('Pinata metadata upload failed');
        }

        const result = await response.json();
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('Pinata metadata upload error:', error);
        throw new Error('Failed to upload metadata to Pinata');
    }
};