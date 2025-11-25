// Configuration for API endpoints
// In production (when served from same domain), use relative URLs
// In development, use localhost
// Can override with VITE_API_URL environment variable
const getApiUrl = () => {
  // If explicitly set, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production when served from same domain, use relative URL
  if (import.meta.env.PROD) {
    return ''; // Empty string means relative URLs (same domain)
  }
  
  // Development default
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

