import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy handles routing to :3000
});

// Request interceptor to add API Key
api.interceptors.request.use((config) => {
    const apiKey = localStorage.getItem('evolution_api_key');
    if (apiKey) {
        config.headers['apikey'] = apiKey;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        // Some endpoints wrap data in { success: true, data: ... }
        return response.data;
    },
    (error) => {
        if (error.response) {
            console.error('API Error:', error.response.data);
            if (error.response.status === 401) {
                localStorage.removeItem('evolution_api_key');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
