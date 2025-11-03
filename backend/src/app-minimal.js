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

// Minimal API endpoint
app.post('/api/properties', (req, res) => {
    res.json({
        success: true,
        message: 'Minimal backend is working'
    });
});

module.exports = app;
