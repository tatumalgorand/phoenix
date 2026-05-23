# GBPR Quick Start Guide

This guide will help you get started with the GBPR stablecoin system in 5 minutes.

## Prerequisites

- Node.js 16+ installed
- An Ethereum wallet with some testnet ETH (for Sepolia testnet)

## Installation

```bash
cd smart-contracts
npm install
```

## 1. Compile Contracts

```bash
npm run compile
```

This compiles all Solidity contracts and generates artifacts.

## 2. Run Tests

```bash
npm test
```

Run specific test suites:
```bash
npm test test/GBPRToken.test.js
npm test test/UserAccount.test.js
npm test test/AccountFactory.test.js
npm run test:integration
```

## 3. Deploy to Local Network

### Terminal 1: Start local blockchain
```bash
npm run node
```

### Terminal 2: Deploy contracts
```bash
npm run deploy:local
```

Save the output contract addresses!

## 4. Interact with Contracts

Edit `scripts/interact.js` and update the contract addresses:
```javascript
const CONTRACT_ADDRESSES = {
  gbprToken: "0x...", // Your deployed token address
  accountFactory: "0x..." // Your deployed factory address
};
```

Then run:
```bash
npx hardhat run scripts/interact.js --network localhost
```

## 5. Deploy to Testnet (Sepolia)

1. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Edit `.env` with your credentials:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
PRIVATE_KEY=your-private-key-without-0x
ETHERSCAN_API_KEY=your-etherscan-api-key
```

4. Deploy:
```bash
npm run deploy:sepolia
```

5. Verify on Etherscan (optional):
```bash
npx hardhat verify --network sepolia <TOKEN_ADDRESS> <FEE_COLLECTOR_ADDRESS>
npx hardhat verify --network sepolia <FACTORY_ADDRESS> <TOKEN_ADDRESS> <CREATION_FEE>
```

## Common Tasks

### Create a User Account
```javascript
const factory = await ethers.getContractAt("AccountFactory", FACTORY_ADDRESS);
const fee = await factory.accountCreationFee();
await factory.createMyAccount({ value: fee });
const myAccount = await factory.getAccount(myAddress);
```

### Mint GBPR Tokens
```javascript
const gbpr = await ethers.getContractAt("GBPRToken", TOKEN_ADDRESS);
await gbpr.mint(recipientAddress, ethers.parseEther("1000"));
```

### Transfer GBPR (with 0.1% fee)
```javascript
const gbpr = await ethers.getContractAt("GBPRToken", TOKEN_ADDRESS);
await gbpr.transfer(recipientAddress, ethers.parseEther("100"));
// Recipient receives 99.9 GBPR, 0.1 GBPR goes to fee collector
```

### Deposit to User Account
```javascript
const account = await ethers.getContractAt("UserAccount", ACCOUNT_ADDRESS);

// Deposit ERC20
await token.approve(ACCOUNT_ADDRESS, amount);
await account.depositCrypto(tokenAddress, amount);

// Deposit ETH
await signer.sendTransaction({ to: ACCOUNT_ADDRESS, value: ethers.parseEther("1") });
```

### Withdraw from User Account
```javascript
const account = await ethers.getContractAt("UserAccount", ACCOUNT_ADDRESS);
await account.withdrawToken(tokenAddress, recipientAddress, amount);
await account.withdrawETH(recipientAddress, amount);
```

## Administrative Tasks

Edit `scripts/admin.js` and uncomment the tasks you want to perform:

```bash
npx hardhat run scripts/admin.js --network localhost
```

Available admin tasks:
- Add/remove minters
- Change fee collector
- Update account creation fee
- Blacklist/unblacklist addresses
- Withdraw collected fees

## Useful Commands

```bash
# Compile contracts
npm run compile

# Run all tests
npm test

# Run specific test
npx hardhat test test/GBPRToken.test.js

# Start local node
npm run node

# Deploy to local
npm run deploy:local

# Deploy to Sepolia
npm run deploy:sepolia

# Clean artifacts
npm run clean

# Get help
npx hardhat help
```

## Troubleshooting

### "Insufficient funds" error
- Make sure your wallet has enough ETH for gas fees
- For testnet, get free ETH from faucets

### "Nonce too high" error
- Reset your account in MetaMask: Settings > Advanced > Reset Account

### "Cannot download compiler" error
- Check your internet connection
- Try again - sometimes mirrors are temporarily down

### Tests failing
- Make sure you're using Node.js 16+
- Run `npm install` again
- Clear cache: `npm run clean`

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Explore [GBPR_INTEGRATION.md](../GBPR_INTEGRATION.md) for Phoenix wallet integration
3. Review smart contract code in `contracts/` directory
4. Check out example scripts in `scripts/` directory
5. Run integration tests: `npm run test:integration`

## Getting Help

- Check the test files for usage examples
- Read inline code comments in contracts
- Review the interaction scripts
- Open an issue in the repository

## Security Warning

⚠️ **Never commit your private keys or `.env` file to version control!**

The `.env` file is already in `.gitignore`, but always double-check before committing.

For production deployment, use:
- Hardware wallets
- Multi-sig wallets
- Professional security audits
- Proper key management systems

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Solidity Documentation](https://docs.soliditylang.org/)

---

Happy building with GBPR! 🚀
