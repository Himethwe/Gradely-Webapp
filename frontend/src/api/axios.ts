import axios from 'axios';

const BASE_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
api.interceptors.request.use((config) => {

    const token = localStorage.getItem('access_token');
    
    if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
    } 
    // IF Guest, no action
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;