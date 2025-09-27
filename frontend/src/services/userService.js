import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try { return JSON.parse(raw)?.token || null; } catch { return null; }
}

const client = axios.create({ baseURL: API_URL });
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const userService = {
  // ดึงนักศึกษาทั้งหมด (ใช้ endpoint /api/projects/search-users)
  async listStudents(limit = 1000) {
    const r = await client.get("/api/projects/search-users", {
      params: { role: "student", limit },
    });
    return r.data; // [{_id, username, email, ...}]
  },
  // ดึงอาจารย์ทั้งหมด (ใช้ endpoint /api/teachers หรือ /api/admin/teachers แล้วแต่สิทธิ์)
  async listTeachers() {
    const r = await client.get("/api/teachers");
    return r.data;
  },
  async listAll() {
    const res = await client.get('/api/users');
    return res.data; 
  },

  // นับผู้ใช้งานทั้งหมด
  async countAllUsers() {
    const [students, teachers] = await Promise.all([
      this.listStudents(),
      this.listTeachers(),
    ]);
    const sCount = Array.isArray(students) ? students.length : 0;
    const tCount = Array.isArray(teachers) ? teachers.length : 0;
    return sCount + tCount;
  },
};
