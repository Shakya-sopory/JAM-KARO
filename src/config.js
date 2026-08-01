// Configuration for API Endpoints (automatically switches between localhost and production URL)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
