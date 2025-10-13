import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  const direct =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken');
  if (direct) return String(direct).replace(/^"|"$/g, '');
  try {
    const maybe =
      JSON.parse(localStorage.getItem('user') || '{}') ||
      JSON.parse(localStorage.getItem('userInfo') || '{}');
    return (maybe?.token || maybe?.accessToken || maybe?.jwt || '').replace(/^"|"$/g, '');
  } catch {
    return '';
  }
}

const client = axios.create({ baseURL: API_URL });
client.interceptors.request.use((config) => {
  const t = getToken();
  config.headers = config.headers || {};
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const appointmentService = {
  async create(data) {
    const r = await client.post('/api/appointments', data);
    return r.data;
  },
  // “ของฉัน”
  async list(params = {}) {
    const r = await client.get('/api/appointments', { params });
    return r.data;
  },
  //  “ทั้งหมด” 
  async listAll(params = {}) {
    const r = await client.get('/api/appointments/all', { params });
    return r.data;
  },
  async get(id) {
    const r = await client.get(`/api/appointments/${encodeURIComponent(String(id))}`);
    return r.data;
  },
  async update(id, data) {
    const r = await client.patch(`/api/appointments/${encodeURIComponent(String(id))}`, data);
    return r.data;
  },
  async updateStatus(id, payload) {
    const r = await client.patch(`/api/appointments/${encodeURIComponent(String(id))}/status`, payload);
    return r.data;
  },
  async requestReschedule(id, payload) {
    const r = await client.post(`/api/appointments/${encodeURIComponent(String(id))}/reschedule-request`, payload);
    return r.data;
  },
  async respondToReschedule(id, payload) {
    const r = await client.post(`/api/appointments/${encodeURIComponent(String(id))}/reschedule-response`, payload);
    return r.data;
  },
  async remove(id) {
    const r = await client.patch(`/api/appointments/${encodeURIComponent(String(id))}/status`, { status: 'cancelled' });
    return r.data;
  },
};

export const getAppointments = (params = {}) => appointmentService.list(params);

export default appointmentService;