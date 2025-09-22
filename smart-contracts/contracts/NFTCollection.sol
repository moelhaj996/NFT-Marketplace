// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTCollection is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    mapping(uint256 => address) public creators;
    mapping(uint256 => uint256) public royaltyPercentage;

    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);

    constructor() ERC721("NFT Marketplace", "NFTM") Ownable(msg.sender) {}

    function mintNFT(
        address recipient,
        string memory tokenURI,
        uint256 royalty
    ) public returns (uint256) {
        require(royalty <= 1000, "Royalty too high"); // Max 10%

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        creators[newTokenId] = msg.sender;
        royaltyPercentage[newTokenId] = royalty;

        emit NFTMinted(newTokenId, msg.sender, tokenURI);
        return newTokenId;
    }

    function getRoyaltyInfo(uint256 tokenId) external view returns (address, uint256) {
        return (creators[tokenId], royaltyPercentage[tokenId]);
    }

    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIds;
    }
}