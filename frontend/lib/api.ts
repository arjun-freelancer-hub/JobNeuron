import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if needed
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're on public pages (landing, login, register)
      // This allows these pages to handle their own 401 errors gracefully
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const publicPaths = ['/', '/login', '/register'];
        const isPublicPath = publicPaths.includes(currentPath) || 
                            currentPath.startsWith('/login') || 
                            currentPath.startsWith('/register');
        
        if (!isPublicPath) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API methods
export const discoverJobs = async (filters: {
  platform: string;
  title?: string;
  location?: string;
  limit?: number;
}) => {
  const response = await api.post('/jobs/discover', filters);
  return response.data;
};

export const applyToJob = async (data: {
  jobId: string;
  resumeId: string;
  jobUrl: string;
  platform: string;
  email?: string;
  phone?: string;
}) => {
  const response = await api.post('/applications/apply', data);
  return response.data;
};

export const getJobApplicationStatus = async (jobId: string) => {
  const response = await api.get(`/applications/job/${jobId}`);
  return response.data;
};

export const getApplications = async () => {
  const response = await api.get('/applications');
  return response.data;
};

export default api;
