# NFT Marketplace

A complete NFT marketplace built with Solidity smart contracts and Next.js frontend, featuring minting, buying, selling, and auction functionality.

## 🎯 Features

- **NFT Minting**: Create ERC-721 NFTs with IPFS metadata storage
- **Marketplace**: Buy and sell NFTs with fixed prices
- **Auctions**: Time-based auction system with bidding
- **Royalties**: Creator royalties up to 10%
- **Web3 Integration**: Connect with MetaMask and other wallets
- **Responsive Design**: Mobile-friendly interface
- **IPFS Storage**: Decentralized metadata and image storage

## 🛠 Tech Stack

### Smart Contracts
- **Solidity** ^0.8.19
- **Hardhat** for development and testing
- **OpenZeppelin** contracts for security
- **Ethers.js** for blockchain interaction

### Frontend
- **Next.js** 14+ with TypeScript
- **Tailwind CSS** for styling
- **Wagmi** & **RainbowKit** for Web3 connectivity
- **IPFS** for decentralized storage

## 📋 Project Structure

```
NFT-Marketplace/
├── smart-contracts/
│   ├── contracts/
│   │   ├── NFTCollection.sol
│   │   └── NFTMarketplace.sol
│   ├── scripts/
│   │   └── deploy.js
│   ├── test/
│   │   └── NFTMarketplace.test.js
│   └── hardhat.config.js
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── CreateNFT.tsx
    │   │   └── NFTGrid.tsx
    │   ├── hooks/
    │   │   └── useNFTContract.ts
    │   └── lib/
    │       ├── web3Config.ts
    │       └── ipfs.ts
    └── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (Note: Hardhat v3+ requires specific Node versions)
- npm or yarn
- MetaMask or other Web3 wallet

### Smart Contract Setup

1. **Navigate to smart contracts directory:**
   ```bash
   cd smart-contracts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # - ALCHEMY_API_KEY: Get from https://alchemy.com
   # - PRIVATE_KEY: Your wallet private key (without 0x prefix)
   # - ETHERSCAN_API_KEY: For contract verification
   ```

4. **Compile contracts:**
   ```bash
   npm run compile
   ```

5. **Run tests:**
   ```bash
   npm run test
   ```

6. **Deploy to testnet:**
   ```bash
   # Deploy to Goerli testnet
   npm run deploy:goerli
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Create .env.local file with:
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_INFURA_PROJECT_ID=your_infura_project_id
   NEXT_PUBLIC_INFURA_SECRET=your_infura_secret
   # OR for Pinata:
   NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt_token
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📝 Smart Contract Details

### NFTCollection.sol
- **Standard**: ERC-721 with URI storage
- **Features**:
  - Mint NFTs with custom metadata
  - Creator royalty tracking (up to 10%)
  - Token URI management

### NFTMarketplace.sol
- **Features**:
  - List NFTs for fixed-price sale
  - Auction-based listings with time limits
  - Automatic bid refunds
  - Marketplace fee system (default 2.5%)
  - Owner controls and emergency functions

## 🧪 Testing

The project includes comprehensive tests covering:

- ✅ NFT minting with metadata
- ✅ Fixed-price marketplace transactions
- ✅ Auction bidding and settlement
- ✅ Fee calculations and transfers
- ✅ Access controls and security
- ✅ Event emissions
- ✅ Edge cases and error conditions

**Run tests:**
```bash
cd smart-contracts
npm run test
```

## 🌐 Deployment Networks

### Testnets
- **Goerli**: Recommended for testing
- **Sepolia**: Alternative testnet

### Mainnets
- **Ethereum**: Primary deployment target
- **Polygon**: Lower gas costs
- **Arbitrum**: Layer 2 scaling

**Deploy commands:**
```bash
# Testnet deployment
npm run deploy:goerli

# Mainnet deployment (use with caution!)
npm run deploy:mainnet
```

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Owner-only functions
- **Input Validation**: Parameter checks and limits
- **Safe Transfers**: ERC-721 safeTransferFrom usage
- **Auction Safety**: Automatic bid refunds
- **Fee Limits**: Maximum 10% fees and royalties

## 🎨 Frontend Components

### CreateNFT
- File upload with preview
- Metadata input (name, description, attributes)
- Royalty percentage slider
- IPFS upload integration
- Transaction status tracking

### NFTGrid
- Responsive marketplace display
- Auction countdown timers
- Buy now and bid functionality
- Real-time price updates
- Transaction status feedback

## 🔧 Customization

### Adding Features
1. **New Contract Functions**: Add to Solidity contracts
2. **Frontend Integration**: Update hooks and components
3. **Test Coverage**: Add corresponding tests

### Styling
- Modify Tailwind classes in components
- Update `tailwind.config.js` for custom themes
- Add custom CSS in globals.css

## 📚 API Reference

### Contract Functions

**NFTCollection:**
- `mintNFT(address to, string tokenURI, uint256 royalty)`
- `getRoyaltyInfo(uint256 tokenId)`

**NFTMarketplace:**
- `listItem(address nftContract, uint256 tokenId, uint256 price, bool isAuction, uint256 duration)`
- `buyItem(uint256 listingId)`
- `placeBid(uint256 listingId)`
- `endAuction(uint256 listingId)`

### Frontend Hooks

**useNFTContract:**
- `mintNFT(tokenURI, royalty)`
- `listNFT(tokenId, price, isAuction, duration)`
- `buyNFT(listingId, price)`
- `placeBid(listingId, amount)`

## 🐛 Troubleshooting

### Common Issues

1. **Node.js Version Conflict**
   - Hardhat v3+ requires specific Node versions
   - Use Node.js 18.x or 20.x LTS versions

2. **Transaction Failures**
   - Check wallet connection
   - Ensure sufficient ETH for gas
   - Verify contract approvals

3. **IPFS Upload Issues**
   - Verify API keys in environment
   - Check network connectivity
   - Try alternative IPFS providers

4. **Contract Not Found**
   - Ensure contracts are deployed
   - Check network configuration
   - Verify contract addresses

### Getting Help

- Check console logs for error details
- Verify environment variable configuration
- Ensure wallet is connected to correct network
- Review transaction details on block explorer

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 🔗 Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [IPFS Documentation](https://docs.ipfs.io/)

---

Built with ❤️ for the decentralized web