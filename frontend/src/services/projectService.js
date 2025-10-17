import axios from 'axios';

// Service สำหรับจัดการข้อมูล Project
// ให้บริการสร้าง แก้ไข ลบ และดึงรายการโปรเจค

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch { return null; }
}

const client = axios.create({ baseURL: API_URL });
client.interceptors.request.use((config) => {
  const t = getToken();
  if (!config.headers) config.headers = {};
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const projectService = {
  
  async createForm(fd){ const r = await client.post('/api/projects', fd, { headers: { 'Content-Type': 'multipart/form-data' }}); return r.data; },
// ดึงโปรเจคทั้งหมด
  async list() {
    const r = await client.get('/api/projects');
    return r.data;
  },
  // ดึงโปรเจคที่เกี่ยวข้องกับฉัน
  async listMine() {
    const r = await client.get('/api/projects/mine');
    return r.data;
  },
  // สร้างโปรเจคใหม่
  async create({ name, description, advisorId, memberIds = [], academicYear, files = [] }) {
    const payload = {
      name,
      description,
      advisorId,
      memberIds,
      academicYear,
      files,
    };
    const r = await client.post('/api/projects', payload);
    return r.data;
  },
  // ดึงโปรเจคตาม id
  async get(id) {
    const r = await client.get(`/api/projects/${id}`);
    return r.data;
  },
  // แก้ไขโปรเจค
  async update(id, payload) {
    const r = await client.patch(`/api/projects/${id}`, payload);
    return r.data;
  },
  // ลบโปรเจค
  async remove(id) {
    const r = await client.delete(`/api/projects/${id}`);
    return r.data;
  },
  // ค้นหาผู้ใช้เพื่อเพิ่มสมาชิก
  async searchUsers({ q = '', role = 'student', academicYear, excludeProject, excludeIds = [], limit = 10 } = {}) {
    const params = {};
    if (q) params.q = q;
    if (role) params.role = role;
    if (academicYear) params.academicYear = academicYear;
    if (excludeProject) params.excludeProject = excludeProject;
    if (excludeIds.length) params.excludeIds = excludeIds.join(',');
    if (limit) params.limit = limit;
    const r = await client.get('/api/projects/search-users', { params });
    return r.data;
  },
  // เพิ่มสมาชิก
  async addMembers(id, memberIds = []) {
    const r = await client.patch(`/api/projects/${id}/members/add`, { memberIds });
    return r.data;
  },
  // ลบสมาชิก
  async removeMembers(id, memberIds = []) {
    const r = await client.patch(`/api/projects/${id}/members/remove`, { memberIds });
    return r.data;
  },
};