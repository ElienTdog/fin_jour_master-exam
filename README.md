<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1vX_t-p_fmiEwlfmioYh4MFz6xHLNnL45

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Feishu MCP and Bitable Snapshot

1. Ensure workspace MCP config exists at `../.cursor/mcp.json`
2. Restart Cursor and confirm `feishu` is connected in MCP panel
3. Run a direct Feishu snapshot (fields + views + first 10 records):
   `npm run feishu:snapshot`

Optional environment overrides:
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_APP_TOKEN` (default: `Pyddb4ZISahwSXsdzOrcaaljnQg`)
- `FEISHU_TABLE_ID` (default: `tblJtP7hMKzCrhGT`)
- `FEISHU_VIEW_ID` (default: `vewq5vt9S0`)
- `FEISHU_PAGE_SIZE` (default: `50`)
