# GBPR Integration with Phoenix Wallet

This document describes how the GBPR stablecoin system integrates with the Phoenix Bitcoin Lightning wallet.

## Overview

The Phoenix wallet repository now includes smart contracts for the GBPR (Great British Pound Reformed) stablecoin system. This creates a bridge between the Lightning Network (Bitcoin Layer 2) and EVM-compatible blockchains (Ethereum, Polygon, etc.).

## Architecture

### Current Phoenix Wallet
- **Technology**: Bitcoin Lightning Network
- **Purpose**: Fast, low-cost Bitcoin payments
- **Components**: 
  - `phoenix-shared`: Kotlin Multiplatform business logic
  - `phoenix-android`: Android UI
  - `phoenix-ios`: iOS UI

### New GBPR System
- **Technology**: Ethereum/EVM-compatible smart contracts
- **Purpose**: GBP-pegged stablecoin with banking features
- **Components**:
  - `smart-contracts`: Solidity contracts for GBPR token and user accounts

## Integration Points

### 1. Multi-Currency Support
The Phoenix wallet can be extended to support both Bitcoin (via Lightning) and GBPR (via smart contracts):

```
Phoenix Wallet
├── Bitcoin/Lightning Balance
└── GBPR Balance (from smart contract)
```

### 2. Cross-Chain Functionality

Potential integration features:

#### A. Unified Balance Display
- Show both BTC and GBPR balances in a single view
- Display total portfolio value in GBP

#### B. Cross-Chain Transfers
- Convert BTC to GBPR (via atomic swaps or exchanges)
- Transfer GBPR between users
- Lightning payments for BTC, smart contract transactions for GBPR

#### C. Account Management
- One Phoenix wallet controls both Lightning channels and GBPR accounts
- Single recovery phrase for both systems (different derivation paths)

## Implementation Roadmap

### Phase 1: Smart Contract Deployment (Completed)
- [x] Deploy GBPR token contract
- [x] Deploy AccountFactory contract
- [x] Deploy to testnet
- [x] Verify and test contracts

### Phase 2: Backend Integration (Future)
- [ ] Create backend service to monitor GBPR transactions
- [ ] Implement fiat on-ramp (bank transfer → GBPR minting)
- [ ] Price oracle integration for crypto-to-GBPR conversion
- [ ] Exchange service between BTC and GBPR

### Phase 3: Wallet Integration (Future)
- [ ] Add GBPR support to `phoenix-shared` module
- [ ] Create UI for GBPR account management
- [ ] Implement GBPR send/receive functionality
- [ ] Add portfolio view with both BTC and GBPR

### Phase 4: Advanced Features (Future)
- [ ] Lightning ↔ GBPR swaps
- [ ] Multi-signature GBPR accounts
- [ ] Recurring payments in GBPR
- [ ] DeFi integration (yield farming, lending)

## Technical Considerations

### Key Management
- **Bitcoin/Lightning**: Uses BIP32/BIP39 derivation (m/84'/0'/0')
- **Ethereum/GBPR**: Uses same seed but different derivation path (m/44'/60'/0')
- Same 12-word recovery phrase protects both assets

### Transaction Fees
- **Lightning**: Minimal routing fees (millisats)
- **GBPR**: 0.1% transfer fee + gas fees
- Gas optimization is critical for competitive transaction costs

### Network Connectivity
- **Lightning**: Requires persistent connection to Lightning nodes
- **GBPR**: Standard Ethereum RPC connection (Infura, Alchemy, etc.)

### Security
- **Lightning**: Channel states, watchtowers
- **GBPR**: Smart contract security, private key protection
- Both require secure local storage and backup

## Example User Flow

### Scenario: User wants to hold GBP-pegged stablecoins

1. **Account Creation**
   - User opens Phoenix wallet
   - Enables GBPR feature
   - Factory creates UserAccount contract

2. **Funding Account**
   - User bank transfers £100 to system bank account
   - References their wallet address
   - Backend monitors transfer
   - System mints 100 GBPR to user's account

3. **Using GBPR**
   - Send GBPR to other users (0.1% fee)
   - Hold as stable value storage
   - View balance alongside BTC balance

4. **Withdrawal**
   - Request withdrawal to bank account
   - System burns GBPR
   - Initiates bank transfer

## Development Setup

### Prerequisites
- Node.js 16+ (for smart contracts)
- Android Studio (for Android app)
- Xcode (for iOS app)
- Ethereum testnet access

### Running Tests
```bash
cd smart-contracts
npm install
npm test
```

### Deploying to Testnet
```bash
cd smart-contracts
cp .env.example .env
# Edit .env with your credentials
npm run deploy:sepolia
```

## API Integration (Future)

The wallet will need backend APIs for:

### Fiat On-Ramp
```
POST /api/v1/fiat/deposit
{
  "amount": 100,
  "currency": "GBP",
  "reference": "0x123...",
  "bankAccount": "12345678"
}
```

### GBPR Minting
```
POST /api/v1/gbpr/mint
{
  "userAddress": "0x123...",
  "amount": "100",
  "fiatReference": "TXN123456"
}
```

### Price Oracle
```
GET /api/v1/prices
Response:
{
  "BTC-GBP": "35000",
  "ETH-GBP": "2000",
  "timestamp": 1234567890
}
```

## Security Considerations

### Smart Contract Security
- All contracts use OpenZeppelin libraries
- Reentrancy guards on all state-changing functions
- Access control with ownership patterns
- Emergency pause functionality (future)

### Private Key Security
- Never store private keys in plain text
- Use secure enclaves on mobile devices
- Implement biometric authentication
- Support hardware wallet integration (future)

### Compliance
- KYC/AML for fiat on-ramp
- Transaction monitoring
- Blacklist functionality in GBPR token
- Regulatory reporting capabilities

## Monitoring and Operations

### Key Metrics to Monitor
- Total GBPR supply
- Total fees collected
- Number of active accounts
- Transaction volume
- Gas costs

### Operational Tasks
- Monitor fiat deposits
- Process mint requests
- Handle withdrawal requests
- Respond to support issues
- Update price oracles

## Conclusion

The GBPR smart contracts provide a foundation for expanding Phoenix wallet beyond Bitcoin to include stablecoins and DeFi. The modular architecture allows gradual integration without disrupting existing Lightning functionality.

Next steps involve backend development, wallet integration, and thorough security audits before mainnet deployment.
