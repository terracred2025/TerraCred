let Database;
try {
    Database = require('better-sqlite3');
} catch (error) {
    console.warn('better-sqlite3 not available in serverless environment');
    Database = null;
}

const path = require('path');
const fs = require('fs');

// Determine database path based on environment
// In serverless (Vercel), use /tmp directory which is writable
// In local dev, use the data directory
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = isServerless ? '/tmp' : path.join(__dirname, '../../data');

// Ensure data directory exists (only needed for local dev)
if (!isServerless && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'terracred.db');

class DatabaseService {
    constructor() {
        console.log(`📦 Initializing SQLite database at: ${DB_PATH}`);

        try {
            if (!Database) {
                console.warn('⚠️ SQLite not available - using in-memory fallback');
                this.useFallback = true;
                this.memoryStore = {
                    properties: new Map(),
                    users: new Map(),
                    transactions: new Map()
                };
                this.propertyCounter = 1;
                this.userCounter = 1;
                this.transactionCounter = 1;
                console.log(`✅ In-memory database initialized successfully`);
                return;
            }

            this.useFallback = false;
            this.db = new Database(DB_PATH);
            this.db.pragma('journal_mode = WAL'); // Better performance
            this.initializeTables();
            this.propertyCounter = this.getMaxPropertyId() + 1;
            this.userCounter = this.getMaxUserId() + 1;
            this.transactionCounter = this.getMaxTransactionId() + 1;
            console.log(`✅ Database initialized successfully`);
        } catch (error) {
            console.error('Failed to initialize SQLite, using in-memory fallback:', error.message);
            this.useFallback = true;
            this.memoryStore = {
                properties: new Map(),
                users: new Map(),
                transactions: new Map()
            };
            this.propertyCounter = 1;
            this.userCounter = 1;
            this.transactionCounter = 1;
        }
    }

    initializeTables() {
        // Properties table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS properties (
                propertyId TEXT PRIMARY KEY,
                owner TEXT NOT NULL,
                address TEXT NOT NULL,
                value REAL NOT NULL,
                description TEXT,
                proofDocumentUri TEXT,
                appraisalHash TEXT,
                deedHash TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                verifiedAt TEXT,
                verifier TEXT,
                tokenId TEXT,
                tokenAddress TEXT,
                tokenSupply INTEGER NOT NULL,
                createdAt TEXT NOT NULL,
                rejectedAt TEXT,
                rejectionReason TEXT,
                delistedAt TEXT
            )
        `);

        // Users table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                userId TEXT PRIMARY KEY,
                accountId TEXT UNIQUE NOT NULL,
                email TEXT,
                name TEXT,
                kycStatus TEXT,
                kycLevel TEXT,
                kycProvider TEXT,
                kycVerifiedAt TEXT,
                createdAt TEXT NOT NULL
            )
        `);

        // Transactions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS transactions (
                txId TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                propertyId TEXT,
                userAddress TEXT NOT NULL,
                data TEXT,
                timestamp TEXT NOT NULL
            )
        `);

        // Create indices for faster queries
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner);
            CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
            CREATE INDEX IF NOT EXISTS idx_users_accountId ON users(accountId);
            CREATE INDEX IF NOT EXISTS idx_transactions_userAddress ON transactions(userAddress);
            CREATE INDEX IF NOT EXISTS idx_transactions_propertyId ON transactions(propertyId);
        `);

        console.log('✅ Database tables initialized');
    }

    getMaxPropertyId() {
        const result = this.db.prepare(`
            SELECT propertyId FROM properties
            WHERE propertyId LIKE 'PROP%'
            ORDER BY propertyId DESC
            LIMIT 1
        `).get();

        if (!result) return 0;
        const match = result.propertyId.match(/PROP(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    getMaxUserId() {
        const result = this.db.prepare(`
            SELECT userId FROM users
            WHERE userId LIKE 'USER%'
            ORDER BY userId DESC
            LIMIT 1
        `).get();

        if (!result) return 0;
        const match = result.userId.match(/USER(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    getMaxTransactionId() {
        const result = this.db.prepare(`
            SELECT txId FROM transactions
            WHERE txId LIKE 'TX%'
            ORDER BY txId DESC
            LIMIT 1
        `).get();

        if (!result) return 0;
        const match = result.txId.match(/TX(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // ============================================
    // PROPERTY OPERATIONS
    // ============================================

    addProperty(property) {
        const propertyId = property.propertyId || `PROP${String(this.propertyCounter++).padStart(3, '0')}`;
        property.propertyId = propertyId;

        if (this.useFallback) {
            // In-memory fallback
            const prop = {
                propertyId,
                owner: property.owner,
                address: property.address,
                value: property.value,
                description: property.description || '',
                proofDocumentUri: property.proofDocumentUri || '',
                appraisalHash: property.appraisalHash || '',
                deedHash: property.deedHash || '',
                status: property.status || 'pending',
                tokenSupply: property.tokenSupply,
                createdAt: property.createdAt ? new Date(property.createdAt).toISOString() : new Date().toISOString(),
                verifiedAt: property.verifiedAt ? new Date(property.verifiedAt).toISOString() : null,
                verifier: property.verifier || null,
                tokenId: property.tokenId || null,
                tokenAddress: property.tokenAddress || null
            };
            this.memoryStore.properties.set(propertyId, prop);
            return prop;
        }

        const stmt = this.db.prepare(`
            INSERT INTO properties (
                propertyId, owner, address, value, description,
                proofDocumentUri, appraisalHash, deedHash, status,
                tokenSupply, createdAt, verifiedAt, verifier,
                tokenId, tokenAddress
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            propertyId,
            property.owner,
            property.address,
            property.value,
            property.description || '',
            property.proofDocumentUri || '',
            property.appraisalHash || '',
            property.deedHash || '',
            property.status || 'pending',
            property.tokenSupply,
            property.createdAt ? new Date(property.createdAt).toISOString() : new Date().toISOString(),
            property.verifiedAt ? new Date(property.verifiedAt).toISOString() : null,
            property.verifier || null,
            property.tokenId || null,
            property.tokenAddress || null
        );

        return this.getProperty(propertyId);
    }

    getProperty(propertyId) {
        if (this.useFallback) {
            return this.memoryStore.properties.get(propertyId) || null;
        }
        const stmt = this.db.prepare('SELECT * FROM properties WHERE propertyId = ?');
        const row = stmt.get(propertyId);
        return row ? this.deserializeProperty(row) : null;
    }

    getPropertiesByOwner(ownerAddress) {
        if (this.useFallback) {
            return Array.from(this.memoryStore.properties.values())
                .filter(p => p.owner === ownerAddress)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        const stmt = this.db.prepare('SELECT * FROM properties WHERE owner = ? ORDER BY createdAt DESC');
        const rows = stmt.all(ownerAddress);
        return rows.map(row => this.deserializeProperty(row));
    }

    getAllProperties() {
        if (this.useFallback) {
            return Array.from(this.memoryStore.properties.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        const stmt = this.db.prepare('SELECT * FROM properties ORDER BY createdAt DESC');
        const rows = stmt.all();
        return rows.map(row => this.deserializeProperty(row));
    }

    updatePropertyStatus(propertyId, status, additionalData = {}) {
        const property = this.getProperty(propertyId);
        if (!property) return null;

        if (this.useFallback) {
            // Update in-memory store
            property.status = status;
            for (const [key, value] of Object.entries(additionalData)) {
                if (key === 'verifiedAt' || key === 'rejectedAt' || key === 'delistedAt') {
                    property[key] = value ? new Date(value).toISOString() : null;
                } else {
                    property[key] = value;
                }
            }
            this.memoryStore.properties.set(propertyId, property);
            return property;
        }

        // Build dynamic update query
        const updates = ['status = ?'];
        const values = [status];

        // Add additional fields
        for (const [key, value] of Object.entries(additionalData)) {
            if (key === 'verifiedAt' || key === 'rejectedAt' || key === 'delistedAt') {
                updates.push(`${key} = ?`);
                values.push(value ? new Date(value).toISOString() : null);
            } else {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        values.push(propertyId);

        const stmt = this.db.prepare(`
            UPDATE properties
            SET ${updates.join(', ')}
            WHERE propertyId = ?
        `);

        stmt.run(...values);
        return this.getProperty(propertyId);
    }

    deserializeProperty(row) {
        return {
            ...row,
            value: Number(row.value),
            tokenSupply: Number(row.tokenSupply),
            createdAt: row.createdAt,
            verifiedAt: row.verifiedAt,
            rejectedAt: row.rejectedAt,
            delistedAt: row.delistedAt
        };
    }

    // ============================================
    // USER OPERATIONS
    // ============================================

    addUser(user) {
        const userId = user.userId || `USER${String(this.userCounter++).padStart(3, '0')}`;
        user.userId = userId;

        const stmt = this.db.prepare(`
            INSERT INTO users (
                userId, accountId, email, name, kycStatus,
                kycLevel, kycProvider, kycVerifiedAt, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            userId,
            user.accountId,
            user.email || null,
            user.name || null,
            user.kycStatus || null,
            user.kycLevel || null,
            user.kycProvider || null,
            user.kycVerifiedAt ? new Date(user.kycVerifiedAt).toISOString() : null,
            user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString()
        );

        return this.getUser(userId);
    }

    getUser(identifier) {
        // Try by userId first
        let stmt = this.db.prepare('SELECT * FROM users WHERE userId = ?');
        let row = stmt.get(identifier);

        // If not found, try by accountId
        if (!row) {
            stmt = this.db.prepare('SELECT * FROM users WHERE accountId = ?');
            row = stmt.get(identifier);
        }

        return row || null;
    }

    getUserByAccountId(accountId) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE accountId = ?');
        return stmt.get(accountId) || null;
    }

    updateUserKYC(accountId, kycData) {
        const user = this.getUserByAccountId(accountId);
        if (!user) return null;

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(kycData)) {
            if (key === 'kycVerifiedAt') {
                updates.push(`${key} = ?`);
                values.push(value ? new Date(value).toISOString() : null);
            } else {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        values.push(accountId);

        const stmt = this.db.prepare(`
            UPDATE users
            SET ${updates.join(', ')}
            WHERE accountId = ?
        `);

        stmt.run(...values);
        return this.getUserByAccountId(accountId);
    }

    // ============================================
    // TRANSACTION OPERATIONS
    // ============================================

    addTransaction(transaction) {
        const txId = `TX${String(this.transactionCounter++).padStart(6, '0')}`;
        transaction.txId = txId;

        const stmt = this.db.prepare(`
            INSERT INTO transactions (
                txId, type, propertyId, userAddress, data, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            txId,
            transaction.type,
            transaction.propertyId || null,
            transaction.userAddress,
            JSON.stringify(transaction.data || {}),
            transaction.timestamp ? new Date(transaction.timestamp).toISOString() : new Date().toISOString()
        );

        return this.getTransaction(txId);
    }

    getTransaction(txId) {
        const stmt = this.db.prepare('SELECT * FROM transactions WHERE txId = ?');
        const row = stmt.get(txId);
        if (!row) return null;

        return {
            ...row,
            data: JSON.parse(row.data || '{}')
        };
    }

    getTransactionsByUser(userAddress) {
        const stmt = this.db.prepare('SELECT * FROM transactions WHERE userAddress = ? ORDER BY timestamp DESC');
        const rows = stmt.all(userAddress);
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data || '{}')
        }));
    }

    getAllTransactions() {
        const stmt = this.db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC');
        const rows = stmt.all();
        return rows.map(row => ({
            ...row,
            data: JSON.parse(row.data || '{}')
        }));
    }

    // ============================================
    // ASSET OPERATIONS
    // ============================================

    getAssetByTokenId(tokenId) {
        const stmt = this.db.prepare('SELECT * FROM properties WHERE tokenId = ?');
        const row = stmt.get(tokenId);
        if (!row) return null;

        const property = this.deserializeProperty(row);
        return {
            tokenId: property.tokenId,
            tokenAddress: property.tokenAddress,
            propertyId: property.propertyId,
            owner: property.owner,
            address: property.address,
            value: property.value,
            description: property.description,
            tokenSupply: property.tokenSupply,
            status: property.status,
            verifiedAt: property.verifiedAt,
            createdAt: property.createdAt
        };
    }

    getAssetsByOwner(ownerAddress) {
        const stmt = this.db.prepare('SELECT * FROM properties WHERE owner = ? AND tokenId IS NOT NULL ORDER BY createdAt DESC');
        const rows = stmt.all(ownerAddress);
        return rows.map(row => {
            const property = this.deserializeProperty(row);
            return {
                tokenId: property.tokenId,
                tokenAddress: property.tokenAddress,
                propertyId: property.propertyId,
                owner: property.owner,
                address: property.address,
                value: property.value,
                description: property.description,
                tokenSupply: property.tokenSupply,
                status: property.status,
                verifiedAt: property.verifiedAt,
                createdAt: property.createdAt
            };
        });
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    close() {
        this.db.close();
        console.log('✅ Database connection closed');
    }

    // Get database stats
    getStats() {
        const propertiesCount = this.db.prepare('SELECT COUNT(*) as count FROM properties').get().count;
        const usersCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const transactionsCount = this.db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;

        return {
            properties: propertiesCount,
            users: usersCount,
            transactions: transactionsCount,
            dbPath: DB_PATH
        };
    }
}

// Singleton instance
const database = new DatabaseService();

// Handle graceful shutdown
process.on('exit', () => database.close());
process.on('SIGINT', () => {
    database.close();
    process.exit(0);
});

module.exports = database;
