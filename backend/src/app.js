const express = require('express');
const cors = require('cors');
const { Client, PrivateKey, AccountId } = require("@hashgraph/sdk");
require('dotenv').config();

const HederaService = require('./services/hedera.service');
const HCSService = require('./services/hcs.service');
const OracleService = require('./services/oracle.service');
const LiquidationService = require('./services/liquidation.service');

const propertyRoutes = require('./routes/property.routes');
const loanRoutes = require('./routes/loan.routes');
const userRoutes = require('./routes/user.routes');
const assetsRoutes = require('./routes/assets.routes');
const transactionsRoutes = require('./routes/transactions.routes');

const app = express();

//middleware - CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'https://terracred2025.vercel.app',
            'https://frontend-hemjay07s-projects.vercel.app',
            'https://frontend-hemjay07-hemjay07s-projects.vercel.app',
            'https://frontend-six-roan-89.vercel.app'
        ];

        // Check if origin is in allowed list or matches Vercel pattern
        if (allowedOrigins.includes(origin) || origin.match(/\.vercel\.app$/)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());

//init hedera client
const client = Client.forTestnet();
client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY_DER || process.env.HEDERA_PRIVATE_KEY.replace("0x", ""))
);

//init services
const hederaService = new HederaService(client);
const hcsService = new HCSService(client);
const oracleService = new OracleService(client, hcsService);
const liquidationService = new LiquidationService(client, hcsService);

//make services available to routes
app.locals.services = {
    hedera: hederaService,
    hcs: hcsService,
    oracle: oracleService,
    liquidation: liquidationService
}

//routes
app.use('/api/properties', propertyRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/transactions', transactionsRoutes);

//health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: 'testnet'
    });
});

//error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

//start services (only for local development, not serverless)
async function startServices() {
    console.log('Starting TerraCRED backend services...');

    //create or load HCS topic
    if (!process.env.HCS_TOPIC_ID) {
        console.log('Creating new HCS topic...');
        const topicId = await hcsService.createTopic();
        console.log(`Save this to .env: HCS_TOPIC_ID=${topicId}`);
    } else {
        hcsService.topicId = process.env.HCS_TOPIC_ID;
        console.log(`Using existing  HCS Topic: ${process.env.HCS_TOPIC_ID}`);
    }

    //start oracle price updates
    console.log('Starting oracle price updates (every 60 mins)...');
    oracleService.startPriceUpdates(60 * 60 * 1000);

    //start liquidation monitoring (every 5 mins)
    console.log('Starting liquidation monitor...');
    liquidationService.startMonitoring(5 * 60 * 1000);

    console.log('All services started.');
}

// Only start the server if not in serverless environment (Vercel)
if (process.env.VERCEL !== '1' && require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, async () => {
        await startServices();
        console.log(`\n📡 Backend running on http://localhost:${PORT}`);
    });
} else {
    // In serverless, just set the HCS topic ID if available
    if (process.env.HCS_TOPIC_ID) {
        hcsService.topicId = process.env.HCS_TOPIC_ID;
    }
    console.log('Running in serverless mode (Vercel)');
}

module.exports = app;
