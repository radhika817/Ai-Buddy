import axios from 'axios';

// Read API base URL from Vite environment variable (defaults to localhost:8000 for local dev)
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const baseURL = rawBaseUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
