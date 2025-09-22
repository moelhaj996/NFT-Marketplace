const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Starting deployment...");

    // Deploy NFT Collection
    console.log("Deploying NFTCollection...");
    const NFTCollection = await hre.ethers.getContractFactory("NFTCollection");
    const nftCollection = await NFTCollection.deploy();
    await nftCollection.deployed();
    console.log("NFTCollection deployed to:", nftCollection.address);

    // Deploy Marketplace
    console.log("Deploying NFTMarketplace...");
    const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
    const marketplace = await NFTMarketplace.deploy();
    await marketplace.deployed();
    console.log("NFTMarketplace deployed to:", marketplace.address);

    // Save contract addresses
    const contractAddresses = {
        nftCollection: nftCollection.address,
        marketplace: marketplace.address,
        network: hre.network.name,
        deployedAt: new Date().toISOString()
    };

    // Create contracts directory in frontend if it doesn't exist
    const contractsDir = path.join(__dirname, '../../frontend/src/contracts');
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir, { recursive: true });
    }

    // Save addresses
    fs.writeFileSync(
        path.join(contractsDir, 'addresses.json'),
        JSON.stringify(contractAddresses, null, 2)
    );

    // Copy ABIs
    const artifactsDir = path.join(__dirname, '../artifacts/contracts');

    // Copy NFTCollection ABI
    const nftCollectionArtifact = JSON.parse(
        fs.readFileSync(path.join(artifactsDir, 'NFTCollection.sol/NFTCollection.json'))
    );
    fs.writeFileSync(
        path.join(contractsDir, 'NFTCollection.json'),
        JSON.stringify(nftCollectionArtifact, null, 2)
    );

    // Copy NFTMarketplace ABI
    const marketplaceArtifact = JSON.parse(
        fs.readFileSync(path.join(artifactsDir, 'NFTMarketplace.sol/NFTMarketplace.json'))
    );
    fs.writeFileSync(
        path.join(contractsDir, 'NFTMarketplace.json'),
        JSON.stringify(marketplaceArtifact, null, 2)
    );

    console.log("Contract addresses and ABIs saved to frontend/src/contracts/");
    console.log("Deployment completed successfully!");

    // Verification info
    console.log("\nTo verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${nftCollection.address}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${marketplace.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});