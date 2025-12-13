import axios from 'axios';

// 1. Load the API URL from .env (or default to localhost)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Request Interceptor
api.interceptors.request.use((config) => {
    // Attempt to get the token
    const token = localStorage.getItem('access_token');
    
    // IF user is logged in, attach their ID card (Token)
    if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
    } 
    // IF Guest (no token), we do nothing. 
    // The request is sent "clean", and the backend should handle it as a public request.
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;