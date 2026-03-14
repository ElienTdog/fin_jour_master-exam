/* eslint-disable no-console */
const fetch = require("node-fetch");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APP_ID = process.env.FEISHU_APP_ID || "cli_a9e13f7a05399cd3";
const APP_SECRET = process.env.FEISHU_APP_SECRET || "UgjMKW5o0LmqaOokoIA4LfciuzhaDLce";
const APP_TOKEN = process.env.FEISHU_APP_TOKEN || "Pyddb4ZISahwSXsdzOrcaaljnQg";
const TABLE_ID = process.env.FEISHU_TABLE_ID || "tblJtP7hMKzCrhGT";
const VIEW_ID = process.env.FEISHU_VIEW_ID || "vewq5vt9S0";
const PAGE_SIZE = Number(process.env.FEISHU_PAGE_SIZE || 50);

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function getTenantToken() {
  const url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
  const data = await requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
    }),
  });

  if (!data.tenant_access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  }
  return data.tenant_access_token;
}

async function getFields(token) {
  const url =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/fields` +
    "?page_size=500";
  const data = await requestJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (data.data && data.data.items) || [];
}

async function getViews(token) {
  const url =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/views` +
    "?page_size=200";
  const data = await requestJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (data.data && data.data.items) || [];
}

async function getRecords(token) {
  const params = new URLSearchParams();
  params.set("page_size", String(PAGE_SIZE));
  params.set("view_id", VIEW_ID);

  const url =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?` +
    params.toString();

  const data = await requestJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (data.data && data.data.items) || [];
}

async function main() {
  try {
    const token = await getTenantToken();
    const [fields, views, records] = await Promise.all([
      getFields(token),
      getViews(token),
      getRecords(token),
    ]);

    const output = {
      target: {
        app_token: APP_TOKEN,
        table_id: TABLE_ID,
        view_id: VIEW_ID,
        page_size: PAGE_SIZE,
      },
      fields: fields.map((f) => ({
        field_id: f.field_id,
        field_name: f.field_name,
        type: f.type,
      })),
      views: views.map((v) => ({
        view_id: v.view_id,
        view_name: v.view_name,
        view_type: v.view_type,
      })),
      sample_count: Math.min(10, records.length),
      sample_records: records.slice(0, 10).map((r) => ({
        record_id: r.record_id,
        fields: r.fields,
      })),
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error("feishu:snapshot failed");
    console.error(err.message || err);
    process.exit(1);
  }
}

main();
