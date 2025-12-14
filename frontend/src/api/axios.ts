import axios from 'axios';

// On Vercel, frontend and backend are on the same domain.
// We use "/api" so it automatically goes to the backend.
const BASE_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000";

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