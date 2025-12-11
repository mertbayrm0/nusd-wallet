import express from 'express';
import { authenticateToken, authorizeAdmin } from './middleware/auth.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Prisma Database Path is Absolute
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const dbUrl = `file:${dbPath}`;
process.env.DATABASE_URL = dbUrl; // For child processes like prisma db push

console.log('Explicit Database URL set to:', dbUrl);

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from dist folder
// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist')));

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TronWeb } from 'tronweb';
import 'dotenv/config';

// Initialize Prisma with explicit URL
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
});
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// --- TRONGRID API CONFIGURATION ---
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || 'c4e40058-93dc-4a2c-85d1-f8729be38dbb';
const VAULT_ADDRESS = 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F';

// Helper: Verify TRC20 Transaction via TronGrid
async function verifyTronTransaction(txHash) {
    try {
        const response = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`, {
            headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY }
        });

        if (!response.ok) return { valid: false, error: 'Transaction not found or API error' };
        const data = await response.json();
        if (!data.data || data.data.length === 0) return { valid: false, error: 'Transaction not found' };

        const tx = data.data[0];
        const contract = tx.raw_data?.contract?.[0];
        if (!contract) return { valid: false, error: 'Invalid transaction format' };

        const contractType = contract.type;
        let toAddress = '';
        let amount = 0;

        if (contractType === 'TriggerSmartContract') {
            const parameter = contract.parameter?.value;
            // Simplified decoding for TRC20
            const dataHex = parameter?.data || '';
            if (dataHex.startsWith('a9059cbb')) {
                const recipientHex = dataHex.slice(8, 72);
                const amountHex = dataHex.slice(72, 136);
                toAddress = '41' + recipientHex.slice(24); // This needs conversion to Base58 in full impl, but checking match against DB later
                // Note: DB stores Base58. We need Base58 conversion if we want strict matching.
                // For now, let's assume raw check or simple conversion if TronWeb is available.
                // Actually TronWeb is available now.
                try {
                    toAddress = TronWeb.address.fromHex(toAddress);
                } catch (e) { console.warn("Address conversion error", e); }

                amount = parseInt(amountHex, 16) / 1e6;
            }
        } else if (contractType === 'TransferContract') {
            const parameter = contract.parameter?.value;
            // Native TRX transfer (hex to base58)
            try {
                toAddress = TronWeb.address.fromHex(parameter?.to_address);
            } catch (e) { toAddress = parameter?.to_address || ''; }
            amount = (parameter?.amount || 0) / 1e6;
        }

        const isConfirmed = tx.ret?.[0]?.contractRet === 'SUCCESS';
        const timestamp = tx.raw_data?.timestamp || 0;
        const blockNumber = tx.blockNumber || 0;

        // Check if recipient is ANY of our vaults
        const vault = await prisma.vault.findFirst({
            where: { address: toAddress }
        });
        const vaultMatch = !!vault;

        return {
            valid: true,
            txHash,
            from: TronWeb.address.fromHex(tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address) || 'Unknown',
            to: toAddress,
            amount,
            confirmed: isConfirmed,
            timestamp: new Date(timestamp).toISOString(),
            blockNumber,
            vaultMatch,
            vaultId: vault?.id
        };
    } catch (error) {
        console.error('TronGrid API error:', error);
        return { valid: false, error: error.message || 'API request failed' };
    }
}

// --- HELPERS ---
async function findUser(email) {
    return await prisma.user.findUnique({ where: { email }, include: { bankAccounts: true } });
}

async function logSystemAction(type, description, performedBy) {
    console.log(`[${type}] ${description} (by ${performedBy})`);
    // Future: Add to SystemLog model
}

// --- AUTH ENDPOINTS ---

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        if (!email || !password) return res.status(400).json({ error: "Missing fields" });
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'user', balance: 0 }
        });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Register failed" });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "User not found" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: "Invalid password" });

        if (!user.isActive) return res.status(403).json({ error: "Account suspended" });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Login failed" });
    }
});

// --- VAULT ENDPOINTS ---

app.get('/api/admin/vaults', async (req, res) => {
    try {
        const vaults = await prisma.vault.findMany({
            include: { department: true }
        });
        // Fetch ledger (VaultTransactions)
        const ledger = await prisma.vaultTransaction.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json({ vaults, ledger });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Fetch error" });
    }
});

// User Deposit Notification
app.post('/api/deposit/notify', async (req, res) => {
    const { email, amount, network, txHash, memoCode } = req.body;
    try {
        const user = await findUser(email);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        if (!amount || amount < 10) return res.status(400).json({ success: false, error: 'Min deposit 10 USDT' });

        const vault = await prisma.vault.findFirst({ where: { name: 'Main Vault' } }) || (await prisma.vault.findFirst());

        const tx = await prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'crypto_deposit',
                amount: parseFloat(amount),
                status: 'pending',
                network: network || 'TRC20',
                txHash,
                vaultId: vault?.id,
                toAddress: vault?.address
            }
        });

        await logSystemAction('DEPOSIT', `New deposit notification: ${amount} USDT from ${email}`, email);
        res.json({ success: true, message: 'Deposit notification submitted.', transaction: tx });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// Create new Vault (Generate TRON Wallet)
app.post('/api/admin/vaults', async (req, res) => {
    const { name, departmentId } = req.body;
    try {
        // Initialize TronWeb for key generation (Offline generation doesn't need API key, but we pass dummy)
        const tronWeb = new TronWeb({
            fullHost: 'https://api.trongrid.io',
            headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY }
        });

        const account = await tronWeb.createAccount();

        const vault = await prisma.vault.create({
            data: {
                name,
                address: account.address.base58,
                privateKey: account.privateKey,
                departmentId: departmentId || null
            }
        });

        await logSystemAction('ADMIN', `New Vault Created: ${name} (${vault.address})`, 'Admin');
        res.json(vault);
    } catch (e) {
        console.error("Vault creation error:", e);
        res.status(500).json({ error: "Failed to create vault" });
    }
});


// ========== P2P MATCHING SYSTEM ==========

const getCurrentRate = () => 32.0;

// Find best match for buy request
async function findBestMatch(buyRequest) {
    const { amount, userId } = buyRequest;
    // Filter valid sell orders: type=SELL, status=WAITING, userId != buyer
    const matches = await prisma.p2POrder.findMany({
        where: {
            type: 'SELL',
            status: 'WAITING',
            userId: { not: userId }
        }
    });

    if (matches.length === 0) return null;

    // 1. Exact match
    const exact = matches.find(o => Math.abs(o.amount - amount) < 0.1);
    if (exact) return exact;

    // 2. Close match
    const close = matches
        .filter(o => o.amount >= amount * 0.9 && o.amount <= amount * 1.1)
        .sort((a, b) => Math.abs(a.amount - amount) - Math.abs(b.amount - amount));
    if (close.length > 0) return close[0];

    // 3. Partial (large order)
    const large = matches.find(o => o.amount >= amount);
    if (large) return large;

    return null;
}

async function createTrade(sellOrder, buyOrder, amount) {
    const rate = getCurrentRate();
    const trade = await prisma.$transaction(async (prisma) => {
        const newTrade = await prisma.p2PTrade.create({
            data: {
                sellOrderId: sellOrder.id,
                buyOrderId: buyOrder.id,
                sellerId: sellOrder.userId,
                buyerId: buyOrder.userId,
                amount: amount,
                fiatAmount: amount * rate,
                rate: rate,
                status: 'ESCROW_LOCKED',
            }
        });

        // Update Orders
        await prisma.p2POrder.update({ where: { id: sellOrder.id }, data: { status: 'MATCHED' } });
        await prisma.p2POrder.update({ where: { id: buyOrder.id }, data: { status: 'MATCHED' } });

        return newTrade;
    });

    await logSystemAction('P2P', `Trade created: ${trade.id} - ${amount} USDT`, buyOrder.userId);
    return trade;
}

// Create Order (BUY/SELL)
app.post('/api/p2p/order/create', async (req, res) => {
    const { type, amount, email, iban, bankName, accountName } = req.body;
    try {
        const user = await findUser(email);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!amount || amount < 10) return res.status(400).json({ error: 'Min amount 10 USDT' });

        if (type === 'SELL') {
            if (!iban) return res.status(400).json({ error: 'IBAN required for SELL' });
            if (user.balance < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance' });

            // Deduct Balance & Move to Escrow
            await prisma.$transaction(async (prisma) => {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { balance: { decrement: parseFloat(amount) } }
                });
                // Add to Vault Escrow
                const vault = await prisma.vault.findFirst({ where: { name: 'Main Vault' } }) || (await prisma.vault.findFirst());
                if (vault) {
                    await prisma.vault.update({
                        where: { id: vault.id },
                        data: { escrowBalance: { increment: parseFloat(amount) } }
                    });
                    await prisma.vaultTransaction.create({
                        data: {
                            vaultId: vault.id,
                            type: 'escrow_lock_create',
                            amount: parseFloat(amount),
                            network: 'P2P',
                            userEmail: email,
                            timestamp: new Date()
                        }
                    });
                }

                // Create Order
                await prisma.p2POrder.create({
                    data: {
                        type,
                        userId: user.id,
                        amount: parseFloat(amount),
                        fiatAmount: parseFloat(amount) * getCurrentRate(), // Helper fn
                        rate: getCurrentRate(),
                        iban, bankName, accountName,
                        status: 'WAITING'
                    }
                });
            });
        } else {
            // BUY Order
            const order = await prisma.p2POrder.create({
                data: {
                    type,
                    userId: user.id,
                    amount: parseFloat(amount),
                    fiatAmount: parseFloat(amount) * getCurrentRate(),
                    rate: getCurrentRate(),
                    status: 'WAITING'
                }
            });

            // Try Match
            const match = await findBestMatch({ amount: parseFloat(amount), userId: user.id });
            if (match) {
                await createTrade(match, order, parseFloat(amount));
            }
        }

        await logSystemAction('P2P', `${type} order created: ${amount} USDT`, email);
        res.json({ success: true, message: "Order created" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Order failed" });
    }
});

// Get user profile
app.get('/api/users/:email', authenticateToken, async (req, res) => {
    const { email } = req.params;
    // Allow admin or self
    if (req.user.email !== email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const user = await findUser(email);
    if (user) res.json(user);
    else res.status(404).json({ error: 'User not found' });
});

// ========== MERCHANT & AGENT ENDPOINTS ==========

// Get Public Agents (Map)
app.get('/api/public/agents', async (req, res) => {
    try {
        const agents = await prisma.merchant.findMany({
            where: { isActive: true, isAgent: true },
            select: {
                id: true, name: true, slug: true,
                latitude: true, longitude: true,
                address: true, hours: true,
                primaryColor: true, logo: true
            }
        });
        res.json(agents);
    } catch (e) { res.status(500).json({ error: "Agent fetch error" }); }
});

// Get Merchant Public Info
app.get('/api/merchant/:slug', async (req, res) => {
    try {
        const merchant = await prisma.merchant.findUnique({
            where: { slug: req.params.slug },
            include: { department: { include: { vaults: true } } }
        });
        if (!merchant) return res.status(404).json({ error: "Merchant not found" });

        // Get default vault address
        let vaultAddress = null;
        if (merchant.defaultVaultId) {
            const v = await prisma.vault.findUnique({ where: { id: merchant.defaultVaultId } });
            vaultAddress = v?.address;
        } else if (merchant.department.vaults.length > 0) {
            vaultAddress = merchant.department.vaults[0].address;
        }

        res.json({ ...merchant, vaultAddress });
    } catch (e) { res.status(500).json({ error: "Merchant fetch error" }); }
});

// Admin: List Merchants
app.get('/api/admin/merchants', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const merchants = await prisma.merchant.findMany({ include: { department: true } });
        res.json(merchants);
    } catch (e) { res.status(500).json({ error: "Fetch error" }); }
});

// Admin: Create Merchant
app.post('/api/admin/merchant', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const data = req.body;
        const merchant = await prisma.merchant.create({ data });
        await logSystemAction('MERCHANT', `Created merchant ${merchant.name}`, req.user.email);
        res.json(merchant);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Create failed" });
    }
});

// Admin: Update Merchant
app.put('/api/admin/merchant/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const merchant = await prisma.merchant.update({ where: { id }, data });
        await logSystemAction('MERCHANT', `Updated merchant ${merchant.name}`, req.user.email);
        res.json(merchant);
    } catch (e) { res.status(500).json({ error: "Update failed" }); }
});

// Admin: Delete Merchant
app.delete('/api/admin/merchant/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.merchant.delete({ where: { id } });
        await logSystemAction('MERCHANT', `Deleted merchant ${id}`, req.user.email);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Delete failed" }); }
});

// ========== END ADMIN ENDPOINTS ==========
// Dashboard Stats
app.get('/api/admin/system', async (req, res) => {
    try {
        const activeUsers = await prisma.user.count({ where: { isActive: true } });
        const totalVolume = await prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: 'completed' }
        });

        // Mock revenue for now (or calculate from fees if we had them)
        const totalRevenue = 0;

        res.json({
            totalRevenue,
            totalVolume: totalVolume._sum.amount || 0,
            activeUsers
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Stats failed" });
    }
});

// User List
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { bankAccounts: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "User fetch failed" });
    }
});

// Toggle User Status
app.post('/api/admin/user/:email/toggle-status', async (req, res) => {
    const { email } = req.params;
    try {
        const user = await findUser(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updated = await prisma.user.update({
            where: { email },
            data: { isActive: !user.isActive }
        });

        await logSystemAction('ADMIN', `User status toggled: ${email} -> ${updated.isActive}`, 'Admin');
        res.json({ success: true, user: updated });
    } catch (e) {
        res.status(500).json({ error: "Update failed" });
    }
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
});

const PORT = process.env.PORT || 4000;

// Auto-initialize database on startup
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

async function initializeDatabase() {
    console.log('Starting Database Initializer...');

    // 1. Force DB Schema Push (Create Tables)
    try {
        console.log('Running: prisma db push...');
        const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');
        console.log('DB Push Output:', stdout);
        if (stderr) console.warn('DB Push Warn:', stderr);
    } catch (e) {
        console.error('Failed to run prisma db push:', e.message);
        // Continue anyway, maybe it worked partially or tables exist
    }

    // 2. Check & Seed Data
    try {
        // Check if admin user exists
        const adminExists = await prisma.user.findUnique({ where: { email: 'admin@nusd.com' } });

        if (!adminExists) {
            console.log('Database empty, creating default users...');

            const passwordHash = await bcrypt.hash('123456', 10);
            const adminHash = await bcrypt.hash('admin123', 10);

            // Create demo user
            await prisma.user.create({
                data: {
                    email: 'demo@nusd.com',
                    name: 'Demo User',
                    password: passwordHash,
                    balance: 1500.00,
                    role: 'user',
                    trxAddress: 'TAVACpZWxdJyKoVbzC8fjvnrK15MmgYaXW'
                }
            });

            // Create admin user
            await prisma.user.create({
                data: {
                    email: 'admin@nusd.com',
                    name: 'System Admin',
                    password: adminHash,
                    role: 'admin',
                    trxAddress: 'TAVACpZWxdJyKoVbzC8fjvnrK15MmgYaXW'
                }
            });

            // Create default department
            const dept = await prisma.department.create({
                data: { name: 'A Departmanı', color: '#10B981', category: 'MERCHANT' }
            });

            // Create default vault
            await prisma.vault.create({
                data: {
                    name: 'Main Vault',
                    address: 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F',
                    balance: 0.0,
                    departmentId: dept.id
                }
            });

            console.log('Default users and data created successfully!');
        } else {
            console.log('Database already initialized with users.');
        }
    } catch (error) {
        console.error('Database initialization error:', error.message);
    }
}

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using Persistent Database (Prisma + SQLite)`);
    await initializeDatabase();
});
