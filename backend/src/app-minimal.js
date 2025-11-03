const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'https://terracred2025.vercel.app'
        ];
        if (allowedOrigins.includes(origin) || origin.match(/\.vercel\.app$/)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: 'testnet'
    });
});

// In-memory data store for production
const store = {
    properties: new Map(),
    users: new Map(),
    transactions: new Map(),
    propCounter: 1,
    userCounter: 1,
    txCounter: 1
};

// Properties API
app.post('/api/properties', (req, res) => {
    try {
        const { owner, address, value, description, proofDocumentUri } = req.body;
        if (!owner || !address || !value) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const propertyId = `PROP${String(store.propCounter++).padStart(3, '0')}`;
        const property = {
            propertyId, owner, address, value: Number(value),
            description: description || '', proofDocumentUri: proofDocumentUri || '',
            status: 'pending', tokenSupply: Math.floor(value / 100),
            createdAt: new Date().toISOString()
        };

        store.properties.set(propertyId, property);
        res.json({ success: true, property });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/properties', (req, res) => {
    const properties = Array.from(store.properties.values());
    res.json({ success: true, properties });
});

app.get('/api/properties/:id', (req, res) => {
    const property = store.properties.get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, property });
});

// Admin: Verify property
app.post('/api/properties/:id/verify', (req, res) => {
    try {
        const property = store.properties.get(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

        const { verifier, appraisalHash, deedHash } = req.body;

        // Update property to verified status
        property.status = 'verified';
        property.verifiedAt = new Date().toISOString();
        property.verifier = verifier || 'admin';
        property.appraisalHash = appraisalHash || '';
        property.deedHash = deedHash || '';

        // Generate token info (simulated)
        property.tokenId = `0.0.${Math.floor(Math.random() * 1000000)}`;
        property.tokenAddress = `0x${Math.random().toString(16).slice(2, 42)}`;

        store.properties.set(req.params.id, property);

        res.json({
            success: true,
            property,
            message: 'Property verified successfully'
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Reject property
app.post('/api/properties/:id/reject', (req, res) => {
    try {
        const property = store.properties.get(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

        const { reason } = req.body;

        property.status = 'rejected';
        property.rejectedAt = new Date().toISOString();
        property.rejectionReason = reason || 'No reason provided';

        store.properties.set(req.params.id, property);

        res.json({
            success: true,
            property,
            message: 'Property rejected'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Delist property
app.post('/api/properties/:id/delist', (req, res) => {
    try {
        const property = store.properties.get(req.params.id);
        if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

        property.status = 'delisted';
        property.delistedAt = new Date().toISOString();

        store.properties.set(req.params.id, property);

        res.json({
            success: true,
            property,
            message: 'Property delisted'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Users API
app.post('/api/users', (req, res) => {
    const { accountId, email, name } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId required' });

    const userId = `USER${String(store.userCounter++).padStart(3, '0')}`;
    const user = { userId, accountId, email, name, createdAt: new Date().toISOString() };
    store.users.set(accountId, user);
    res.json({ success: true, user });
});

app.get('/api/users/:accountId', (req, res) => {
    const user = store.users.get(req.params.accountId);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, user });
});

// Transactions API
app.post('/api/transactions', (req, res) => {
    const { type, propertyId, userAddress, data } = req.body;
    const txId = `TX${String(store.txCounter++).padStart(6, '0')}`;
    const tx = { txId, type, propertyId, userAddress, data, timestamp: new Date().toISOString() };
    store.transactions.set(txId, tx);
    res.json({ success: true, transaction: tx });
});

app.get('/api/transactions', (req, res) => {
    let txs = Array.from(store.transactions.values());
    if (req.query.userAddress) txs = txs.filter(t => t.userAddress === req.query.userAddress);
    res.json({ success: true, transactions: txs });
});

// Loans/Assets stubs
app.get('/api/assets', (req, res) => {
    const assets = Array.from(store.properties.values()).filter(p => p.tokenId);
    res.json({ success: true, assets });
});

app.post('/api/loans/calculate', (req, res) => {
    const { collateralValue, loanAmount } = req.body;
    res.json({
        success: true,
        ltv: (loanAmount / collateralValue) * 100,
        interestRate: 5,
        maxLoanAmount: collateralValue * 0.7
    });
});

app.post('/api/loans', (req, res) => {
    res.json({ success: true, message: 'In-memory mode - no Hedera integration' });
});

module.exports = app;
