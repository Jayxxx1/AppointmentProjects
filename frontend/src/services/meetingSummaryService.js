import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  const direct = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
  if (direct) return String(direct).replace(/^"|"$/g, '');
  try {
    const maybe = JSON.parse(localStorage.getItem('user') || '{}') || JSON.parse(localStorage.getItem('userInfo') || '{}');
    return String(maybe?.token || maybe?.accessToken || maybe?.jwt || '').replace(/^"|"$/g, '');
  } catch { return ''; }
}

const client = axios.create({ baseURL: API_URL });
client.interceptors.request.use((config) => {
  const t = getToken();
  config.headers = config.headers || {};
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const meetingSummaryService = {
  async list(params = {}) {
    const r = await client.get('/api/meetingsummaries', { params });
    return r.data;
  },
  async get(id) {
    const r = await client.get(`/api/meetingsummaries/${encodeURIComponent(String(id))}`);
    return r.data;
  },
};

export default meetingSummaryService;
