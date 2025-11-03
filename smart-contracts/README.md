# GBPR Stablecoin Smart Contracts

This directory contains the smart contracts for the GBPR (Great British Pound Reformed) stablecoin and blockchain-based banking system.

## Overview

The GBPR system consists of three main smart contracts:

1. **GBPRToken.sol** - The main stablecoin contract with a 0.1% transfer fee
2. **UserAccount.sol** - Individual user wallet contract for holding GBPR and other cryptocurrencies
3. **AccountFactory.sol** - Factory contract for creating new user accounts

## Features

### GBPR Token
- ERC20-compliant stablecoin pegged to GBP
- Automatic 0.1% fee on all transfers
- Minting and burning capabilities
- Blacklist functionality for compliance
- Fee collection mechanism
- Based on USDC architecture, modified for GBP

### User Account
- Individual smart contract wallet for each user
- Store GBPR and other ERC20 tokens
- Accept ETH deposits
- Dual ownership model (user + system owner)
- Track all deposits with timestamps
- Withdrawal controls

### Account Factory
- Create new user accounts on-demand
- Configurable account creation fee
- Track all created accounts
- System-wide account management

## Installation

```bash
npm install
```

## Compilation

```bash
npx hardhat compile
```

## Testing

Run all tests:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/GBPRToken.test.js
```

Run with gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

## Deployment

### Local Hardhat Network

```bash
# Start local node
npx hardhat node

# Deploy in another terminal
npx hardhat run scripts/deploy.js --network localhost
```

### Testnet Deployment (e.g., Sepolia)

1. Create a `.env` file:
```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
PRIVATE_KEY=your-private-key
ETHERSCAN_API_KEY=your-etherscan-api-key
```

2. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

3. Verify contracts:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Usage Examples

### Creating a User Account

```javascript
const accountFactory = await ethers.getContractAt("AccountFactory", FACTORY_ADDRESS);
const creationFee = await accountFactory.accountCreationFee();
const tx = await accountFactory.createMyAccount({ value: creationFee });
await tx.wait();

const myAccountAddress = await accountFactory.getAccount(myAddress);
```

### Minting GBPR Tokens

```javascript
const gbprToken = await ethers.getContractAt("GBPRToken", TOKEN_ADDRESS);
const amount = ethers.parseEther("1000"); // 1000 GBPR
await gbprToken.mint(recipientAddress, amount);
```

### Transferring GBPR (with 0.1% fee)

```javascript
const gbprToken = await ethers.getContractAt("GBPRToken", TOKEN_ADDRESS);
const amount = ethers.parseEther("100"); // 100 GBPR
// User receives 99.9 GBPR, 0.1 GBPR goes to fee collector
await gbprToken.transfer(recipientAddress, amount);
```

### Depositing Crypto to User Account

```javascript
const userAccount = await ethers.getContractAt("UserAccount", ACCOUNT_ADDRESS);

// Deposit ERC20 tokens
const tokenAmount = ethers.parseEther("10");
await token.approve(ACCOUNT_ADDRESS, tokenAmount);
await userAccount.depositCrypto(tokenAddress, tokenAmount);

// Deposit ETH
await signer.sendTransaction({
  to: ACCOUNT_ADDRESS,
  value: ethers.parseEther("1")
});
```

## Fee Structure

- **Transfer Fee**: 0.1% (10 basis points) on all GBPR transfers
- **Account Creation Fee**: Configurable (default: 0.001 ETH)
- **Network Fees**: Standard gas fees apply

## Security Features

- **Ownership Controls**: Only authorized parties can withdraw from user accounts
- **Blacklist**: System owner can blacklist addresses for compliance
- **Reentrancy Protection**: All contracts use ReentrancyGuard
- **Safe ERC20 Operations**: Using OpenZeppelin's SafeERC20
- **Access Control**: Role-based permissions (owner, minters, system owner)

## Contract Architecture

```
AccountFactory
    └── Creates UserAccount instances
        ├── Holds GBPR (from GBPRToken)
        ├── Holds other ERC20 tokens
        └── Holds ETH

GBPRToken (Standalone)
    ├── Minted by authorized minters
    └── Collects 0.1% fee on transfers
```

## Future Enhancements

The following features are planned for future releases:

1. **Fiat On-Ramp Integration**
   - Bank transfer integration
   - Automatic GBPR minting on fiat receipt
   - Reference-based transaction matching

2. **Price Oracle Integration**
   - Real-time crypto price feeds
   - Portfolio valuation in GBP
   - Multi-aggregator price consensus

3. **Exchange Functionality**
   - Crypto-to-GBPR swaps
   - 0.1% exchange fee
   - Liquidity pools

4. **Compliance Features**
   - KYC/AML integration
   - Transaction limits
   - Regulatory reporting

5. **Advanced Account Features**
   - Multi-signature support
   - Spending limits
   - Scheduled transactions
   - Account recovery mechanisms

## Testing on Testnets

### Recommended Testnets
- **Sepolia**: Primary testnet for Ethereum
- **Goerli**: Alternative Ethereum testnet (being deprecated)
- **Polygon Mumbai**: For Layer 2 testing

### Getting Testnet Funds
- Sepolia ETH: https://sepoliafaucet.com/
- Goerli ETH: https://goerlifaucet.com/

## License

Apache 2.0 - See LICENSE file for details

## Support

For issues and questions, please open an issue in the repository.
