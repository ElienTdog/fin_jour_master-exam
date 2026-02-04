const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Needs node-fetch v2 for CommonJS or use dynamic import for v3
require('dotenv').config();

const app = express();
const PORT = 3001; // Backend runs on port 3001

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Configuration from Environment Variables (Create a .env file locally)
const APP_ID = process.env.FEISHU_APP_ID || "cli_a9e13f7a05399cd3";
const APP_SECRET = process.env.FEISHU_APP_SECRET || "UgjMKW5o0LmqaOokoIA4LfciuzhaDLce";
const APP_TOKEN = process.env.FEISHU_APP_TOKEN || "Pyddb4ZISahwSXsdzOrcaaljnQg";
const TABLE_ID = process.env.FEISHU_TABLE_ID || "tblH8zlAGAc1hiN2";

// Endpoint to get questions
app.get('/api/questions', async (req, res) => {
  try {
    console.log('1. Requesting Tenant Access Token...');
    
    // Step 1: Get Tenant Access Token
    const authResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        app_secret: APP_SECRET
      })
    });

    const authData = await authResponse.json();
    
    if (!authData.tenant_access_token) {
      console.error('Auth Error:', authData);
      return res.status(500).json({ error: 'Failed to authenticate with Feishu', details: authData });
    }

    const token = authData.tenant_access_token;
    console.log('2. Token received. Fetching Records...');

    // Step 2: Fetch Records from Bitable
    // Note: We fetch all fields. Filtering happens on frontend or can be added to URL query params here.
    const pageToken = req.query.page_token;
    const pageSize = req.query.page_size || 20;

    let tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=${pageSize}`;
    
    if (pageToken) {
      tableUrl += `&page_token=${pageToken}`;
    }
    
    const recordsResponse = await fetch(tableUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const recordsData = await recordsResponse.json();

    if (!recordsData.data || !recordsData.data.items) {
       console.error('Data Error:', recordsData);
       return res.status(500).json({ error: 'Failed to fetch records', details: recordsData });
    }

    if (recordsData.data.items.length > 0) {
      console.log('DEBUG: First record fields:', JSON.stringify(recordsData.data.items[0].fields, null, 2));
    }

    console.log(`3. Success! Retrieved ${recordsData.data.items.length} records.`);
    
    // Return the items directly to the frontend, along with the next page token
    res.json({ 
      items: recordsData.data.items,
      has_more: recordsData.data.has_more,
      page_token: recordsData.data.page_token,
      total: recordsData.data.total 
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Backend Proxy running at http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});