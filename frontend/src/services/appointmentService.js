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

function normalizeProjectId(v) {
  if (v == null) return '';
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '';
    if (
      (s.startsWith('{') && s.endsWith('}')) ||
      (s.startsWith('[') && s.endsWith(']')) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      try { return normalizeProjectId(JSON.parse(s)); } catch { return s; }
    }
    return s;
  }
  if (Array.isArray(v)) return normalizeProjectId(v[0]);
  if (typeof v === 'object') return normalizeProjectId(v._id || v.id);
  return String(v || '');
}

export const appointmentService = {
  async listAll() {
    const r = await client.get('/api/appointments/all');
    return r.data;
  },
  async list(params = {}) {
    const r = await client.get('/api/appointments/mine', { params });
    return r.data;
  },

  async create(data = {}, files = []) {
    const clean = { ...data };
    // 🔒 บังคับให้เป็นสตริง _id เสมอ
    clean.project = normalizeProjectId(clean.project);

    // (ปลั๊กกันพลาด: ถ้าไม่ได้เลือกโปรเจคให้ throw ทันที)
    if (!/^[a-f\d]{24}$/i.test(clean.project || '')) {
      throw new Error('กรุณาเลือกโปรเจคให้ถูกต้อง (project id ไม่ใช่ ObjectId)');
    }

    if (files && files.length) {
      const fd = new FormData();
      Object.entries(clean).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          fd.append(k, JSON.stringify(v)); // array -> JSON string
        } else {
          fd.append(k, v == null ? '' : v);
        }
      });
      // ย้ำใส่สองฟิลด์เพื่อรองรับ backend ทุกเวอร์ชัน
      fd.set('project', clean.project);
      fd.set('projectId', clean.project);

      for (const f of files) fd.append('files', f);

      const r = await client.post('/api/appointments', fd);
      return r.data;
    } else {
      // JSON mode — ใส่ทั้ง project & projectId
      const payload = { ...clean, projectId: clean.project };
      const r = await client.post('/api/appointments', payload);
      return r.data;
    }
  },

  async get(id) {
    const r = await client.get(`/api/appointments/${encodeURIComponent(String(id))}`);
    return r.data;
  },

  async update(id, data) {
    const r = await client.patch(`/api/appointments/${encodeURIComponent(String(id))}`, data);
    return r.data;
  },

  async remove(id) {
    const r = await client.delete(`/api/appointments/${encodeURIComponent(String(id))}`);
    return r.data;
  },
};

export const getAppointments = (params = {}) => appointmentService.list(params);
export default appointmentService;
