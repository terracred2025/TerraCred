# TerraCred Protocol

A DeFi lending platform built on Hedera that enables borrowing against tokenized real estate assets. TerraCred bridges traditional real estate with decentralized finance, allowing property owners to unlock liquidity without selling their assets

## Hedera Hello Future: Ascension Hackathon 2025

**Demo:** [Live Application](#) | **Video:** [Demo Video](#)

## Overview

TerraCred solves the liquidity problem for real estate owners in Nigeria by:
1. **Tokenizing** real estate properties into fungible RWA (Real World Assets) tokens
2. **Enabling** property owners to use tokens as collateral for loans
3. **Borrowing** heNGN stablecoin without selling their properties
4. **Automating** liquidations and maintaining platform solvency through smart contracts

Built entirely on Hedera with HashPack wallet integration, immutable audit trails via HCS, and real-time oracle pricing.

## ✨ Key Features

### Frontend (Next.js + HashPack)
- 🦜 **HashPack Wallet Integration**: Seamless connection using Hedera WalletConnect
- 🏠 **Property Submission Portal**: Submit properties with details, valuation, and token supply
- 💰 **Borrow Interface**: Deposit collateral and borrow heNGN stablecoin
- 📊 **User Dashboard**: View your properties, loans, health factor, and transaction history
- 💸 **Loan Management**: Repay loans and withdraw collateral
- 👨‍💼 **Admin Panel**: Verify properties and approve KYC (demo purposes)

### Backend API (Express + Hedera SDK)
- 🏠 **Property Management**: Submit, verify, reject, and tokenize real estate
- 🪙 **Token Operations**: Create, mint, burn, associate, and manage RWA tokens via HTS
- 💰 **Lending Operations**: Deposit, borrow, repay, withdraw, liquidate
- 📊 **Oracle Service**: Automated price updates every 60 minutes
- 🔒 **Liquidation Service**: Monitor health factors and execute liquidations
- 📝 **Immutable Audit Trail**: Log all events to Hedera Consensus Service (HCS)
- 👤 **KYC Management**: User verification and compliance tracking
- 📈 **Analytics**: Transaction history, loan details, asset valuation

### Smart Contracts (Solidity)
- 💎 **LendingPool.sol**: Core lending logic with collateral management
- 📊 **PriceOracle.sol**: On-chain price feeds with staleness protection
- 🪙 **Token Standards**: heNGN stablecoin and RWA token implementations

## 🛠️ Tech Stack

**Frontend:**
- Next.js 16 + React 19 + TypeScript
- HashConnect 3.0 (Hedera WalletConnect)
- TailwindCSS + Lucide Icons
- Redux Toolkit for state management

**Backend:**
- Node.js + Express
- @hashgraph/sdk (Hedera SDK)
- In-memory storage (MVP) - PostgreSQL ready

**Smart Contracts:**
- Solidity 0.8.20
- Hedera Token Service (HTS)
- Hedera Consensus Service (HCS)
- Foundry (testing & deployment)

**Blockchain:**
- Hedera Testnet
- HashPack Wallet
- JSON-RPC Relay for contract interactions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Tokenize │  │  Borrow  │  │Dashboard │  │  Admin   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │             │          │
│       └─────────────┴──────────────┴─────────────┘          │
│                         │                                    │
│                    HashPack Wallet                          │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                    Backend (Express)                        │
│  ┌───────────────┐  ┌────────────┐  ┌─────────────┐        │
│  │   API Routes  │  │  Services  │  │   Storage   │        │
│  │ /properties   │  │  Hedera    │  │  In-Memory  │        │
│  │ /loans        │  │  HCS       │  │   Store     │        │
│  │ /assets       │  │  Oracle    │  │             │        │
│  │ /users        │  │  Liquidate │  │             │        │
│  └───────┬───────┘  └─────┬──────┘  └─────────────┘        │
└──────────┼──────────────────┼──────────────────────────────┘
           │                  │
           │     ┌────────────┴──────────────┐
           │     │                           │
┌──────────┼─────┼───────────────────────────┼───────────────┐
│          │     │    Hedera Network         │               │
│  ┌───────▼─────▼────┐  ┌──────────────┐  ┌▼─────────────┐ │
│  │ Smart Contracts  │  │     HTS      │  │     HCS      │ │
│  │ - LendingPool    │  │ Token Mgmt   │  │ Audit Trail  │ │
│  │ - PriceOracle    │  │ RWA Tokens   │  │ Event Logs   │ │
│  └──────────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Property Tokenization**
   - User submits property → Backend validates → Admin verifies → HTS creates token → Event logged to HCS

2. **Borrowing Flow**
   - User deposits collateral → Smart contract validates → heNGN transferred → Loan created → Event logged

3. **Oracle Updates**
   - Cron job triggers → Backend fetches prices → Updates smart contract → HCS logs event

4. **Liquidation Flow**
   - Service monitors health factors → Detects undercollateralization → Executes liquidation → Seizes collateral

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- HashPack Wallet ([Download here](https://www.hashpack.app/))
- Hedera Testnet account ([Get free testnet HBAR](https://portal.hedera.com/faucet))

### 1️⃣ Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/terracred.git
cd terracred

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2️⃣ Setup Hedera Credentials

1. **Get Testnet Account**
   - Visit [Hedera Portal](https://portal.hedera.com)
   - Create testnet account
   - Fund with test HBAR from [faucet](https://portal.hedera.com/faucet)

2. **Configure Backend**
   ```bash
   cd backend
   cp .env.sample .env
   # Edit .env with your Hedera credentials
   ```

   Required variables:
   ```env
   HEDERA_ACCOUNT_ID=0.0.xxxxx
   HEDERA_PRIVATE_KEY=302e...
   HENGN_TOKEN_ID=0.0.xxxxx
   MASTER_RWA_TOKEN_ID=0.0.xxxxx
   LENDING_POOL_ADDRESS=0x...
   ORACLE_ADDRESS=0x...
   ```

### 3️⃣ Deploy Smart Contracts

```bash
cd contracts
forge build
forge script script/Deploy.s.sol --rpc-url https://testnet.hashio.io/api --broadcast
```

Copy the deployed contract addresses to `backend/.env`

### 4️⃣ Setup Tokens

```bash
cd backend
npm run setup-tokens
```

This creates:
- heNGN stablecoin
- Test RWA property token
- Proper token associations and KYC

Save the generated token IDs to `backend/.env`

### 5️⃣ Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:3000
```

### 6️⃣ Connect HashPack Wallet

1. Install [HashPack browser extension](https://www.hashpack.app/)
2. Create or import account
3. Switch to Hedera Testnet
4. Visit http://localhost:3000
5. Click "Connect HashPack" button
6. Approve connection in HashPack



## 🔌 API Endpoints

**Backend runs on `http://localhost:3001`**

### Properties
- `POST /api/properties` - Submit property
- `GET /api/properties/:id/status` - Check status
- `POST /api/properties/:id/verify` - Admin verify
- `POST /api/properties/:id/reject` - Admin reject

### Loans
- `GET /api/loans/:accountId` - Get loan details
- `POST /api/loans/deposit` - Deposit collateral
- `POST /api/loans/borrow` - Borrow heNGN
- `POST /api/loans/repay` - Repay loan
- `POST /api/loans/withdraw` - Withdraw collateral

### Assets
- `GET /api/assets?owner=0.0.xxxxx` - Get user assets

### Users
- `POST /api/users/kyc` - Submit KYC
- `POST /api/users/:accountId/kyc/approve` - Approve KYC

### Transactions
- `GET /api/transactions?owner=0.0.xxxxx` - Transaction history

See complete API docs in [backend/README.md](backend/README.md)

## 🧪 Testing

```bash
# Test backend API
./test-api.sh

# Test deposit flow
node test-deposit-flow.js

# Test loan details
node test-loan-details.js

# Check token association
node check-hengn-association.js
```

## 💡 How It Works

### User Journey

1. **Property Owner** submits property for tokenization via frontend
2. **Admin** verifies property details and documentation
3. **Backend** creates fungible RWA tokens using Hedera Token Service (HTS)
4. **Property Owner** receives tokens representing fractional ownership
5. **Property Owner** deposits tokens as collateral in smart contract
6. **Smart Contract** validates collateral and calculates borrowing power
7. **Property Owner** borrows heNGN stablecoin (up to 50% LTV)
8. **Oracle Service** updates property prices every 60 minutes
9. **Liquidation Service** monitors health factors and liquidates undercollateralized positions
10. **All events** are logged to Hedera Consensus Service (HCS) for transparency

### Key Metrics

- **Loan-to-Value (LTV)**: 50% (borrow up to half property value)
- **Liquidation Threshold**: 80% (liquidated when collateral falls below)
- **Interest Rate**: 5% annual (heNGN stablecoin)
- **Liquidation Penalty**: 10% bonus for liquidators

## 🎯 Hackathon Context

**Built for:** Hedera Africa Hackathon 2025
**Category:** DeFi / Real World Assets (RWA)
**Region:** Nigeria (heNGN stablecoin pegged to Nigerian Naira)

### Problem Statement

Real estate is the largest asset class in Africa, but property owners face:
- Difficulty accessing liquidity without selling
- Long processes for traditional loans
- High interest rates
- Lack of fractional ownership

### Solution

TerraCred provides:
- Instant liquidity through collateralized loans
- Transparent, automated lending via smart contracts
- Fractional property ownership through tokenization
- Lower interest rates compared to traditional banks
- Immutable audit trail on Hedera

### Hedera Features Utilized

- ✅ **Hedera Token Service (HTS)** - Property tokenization
- ✅ **Hedera Consensus Service (HCS)** - Audit trail logging
- ✅ **Smart Contracts** - Lending logic and oracle
- ✅ **JSON-RPC Relay** - Contract interactions
- ✅ **HashPack Integration** - Wallet connectivity

## 📚 Additional Documentation

- [QUICK_START.md](./QUICK_START.md) - 5-minute setup guide
- [WALLET_IMPLEMENTATION.md](./WALLET_IMPLEMENTATION.md) - HashPack integration details
- [TOKEN_ECONOMICS_FIXES.md](./TOKEN_ECONOMICS_FIXES.md) - Token economics
- [FEE_IMPLEMENTATION.md](./FEE_IMPLEMENTATION.md) - Fee structure
- [REDEPLOY_GUIDE.md](./REDEPLOY_GUIDE.md) - Deployment guide


For detailed debugging, check browser console (F12) and backend logs.

## 🚀 Production Considerations

This is a hackathon MVP. For production deployment:

- [ ] Replace in-memory storage with PostgreSQL
- [ ] Implement JWT authentication and authorization
- [ ] Add comprehensive input validation and sanitization
- [ ] Implement rate limiting and DDoS protection
- [ ] Add structured logging (Winston/Pino)
- [ ] Set up monitoring and alerting
- [ ] Conduct security audit of smart contracts
- [ ] Implement automated testing (unit, integration, e2e)
- [ ] Add proper error handling and recovery
- [ ] Scale oracle and liquidation services

