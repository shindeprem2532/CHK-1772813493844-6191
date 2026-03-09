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
