const fetch = require('node-fetch');

// Configuration from Environment Variables (or defaults)
const APP_ID = process.env.FEISHU_APP_ID || "cli_a9e13f7a05399cd3";
const APP_SECRET = process.env.FEISHU_APP_SECRET || "UgjMKW5o0LmqaOokoIA4LfciuzhaDLce";
const APP_TOKEN = process.env.FEISHU_APP_TOKEN || "Pyddb4ZISahwSXsdzOrcaaljnQg";
const TABLE_ID = process.env.FEISHU_TABLE_ID || "tblH8zlAGAc1hiN2";

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. Get Tenant Access Token
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

    // 2. Fetch Records from Bitable
    const { page_token, page_size = 20 } = req.query;

    let tableUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page_size=${page_size}`;
    
    if (page_token) {
      tableUrl += `&page_token=${page_token}`;
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
    
    // Return the items directly
    res.status(200).json({ 
      items: recordsData.data.items,
      has_more: recordsData.data.has_more,
      page_token: recordsData.data.page_token,
      total: recordsData.data.total 
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};