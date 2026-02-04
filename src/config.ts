// Configuration for the Frontend Application

export const CONFIG = {
  // Set to FALSE to use the backend proxy
  // Set to TRUE to force mock data (useful if backend isn't running)
  USE_MOCK_DATA: false, 

  // Use relative path so requests go through the React dev server proxy (defined in package.json)
  // This avoids CORS issues and "Failed to fetch" errors due to port mismatches.
  API_BASE_URL: "/api",
  
  // App ID/Secret/Token have been moved to server.js (or .env) for security.
  // We no longer keep them in the frontend bundle.
};