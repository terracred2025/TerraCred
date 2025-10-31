export const CONFIG = {
  // Backend API
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  
  // Hedera Network
  HEDERA_NETWORK: 'testnet',
  HEDERA_RPC_URL: 'https://testnet.hashio.io/api',

  // Admin Account (Deployer)
  ADMIN_ACCOUNT_ID: '0.0.7095129',
  
  // Smart Contracts (FINAL - With new heNGN ERC20, ₦10M funding ready)
  // NOTE: For HashConnect transactions, you need the Hedera ID format (0.0.xxxxx)
  // Features: 12-month term, 10% APR, loan extension support
  LENDING_POOL_ADDRESS: '0x7a52108e24d71fFcD9733Bcd1DB89F7741Ae0375',
  LENDING_POOL_ID: '0.0.7165866', // Hedera ID for lending pool contract
  ORACLE_ADDRESS: '0xfEDBe18BDBD1ae52b0b8D529C8CE7b0213E5d317',
  ORACLE_ID: '0.0.7165865', // Hedera ID for oracle contract
  
  // Tokens (UPDATED - New heNGN with 410M pool funding, 1:1 economics)
  HENGN_TOKEN_ADDRESS: '0xfbE25B64b59D6D47d3b5A4ceCD2CAad1DdCD65De',
  HENGN_TOKEN_ID: '0.0.7165863', // Hedera ID for heNGN token
  MASTER_RWA_TOKEN_ID: '0.0.7162666',
  MASTER_RWA_TOKEN_ADDRESS: '0x00000000000000000000000000000000006d4b2a',
  
  // Loan Parameters
  MAX_LTV: 66.67,
  LIQUIDATION_THRESHOLD: 120,
  INTEREST_RATE: 10, // 10% APR as per specification
  ORIGINATION_FEE: 0.1, // 0.1% fee on borrowed amount
  LOAN_TERM_MONTHS: 12, // 12-month repayment period
  
  // Currency
  CURRENCY: 'NGN',
  CURRENCY_SYMBOL: '₦',
} as const;

export const PROPERTY_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;