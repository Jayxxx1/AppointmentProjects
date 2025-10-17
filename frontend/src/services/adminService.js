import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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


export const adminService = {
  // NEW
  async listAllUsers(q = "", role = "all") {
    const params = {};
    if (q?.trim()) params.q = q.trim();
    if (role && role !== "all") params.role = role;
    const r = await client.get("/api/admin/users", { params });
    return r.data;
  },

  // NEW
  async createUser({ username, email, password, role, fullName, studentId }) {
    const payload = { username, email, password, role };
    if (fullName?.trim()) payload.fullName = fullName.trim();
    if (role === "student") payload.studentId = studentId;
    const r = await client.post("/api/admin/users", payload);
    return r.data;
  },

  // ===== Users: UPDATE (status toggle) =====
  // PATCH /api/admin/users/:id/status  { status: 'active'|'inactive' }
  // async updateUserStatus(userId, status) {
  //   const r = await client.patch(`/api/admin/users/${userId}/status`, { status });
  //   return r.data; // { _id, status }
  // },

  // ===== Users: UPDATE (role) =====
  // PATCH /api/admin/users/:id/role  { role }
  async setRole(userId, role) {
    const r = await client.patch(`/api/admin/users/${userId}/role`, { role });
    return r.data; // {_id, username, email, role}
  },

  // ===== Users: UPDATE (generic fields) =====
  // PATCH /api/admin/users/:id  { ...fields }
  async updateUser(userId, updates) {
    const r = await client.patch(`/api/admin/users/${userId}`, updates);
    return r.data;
  },


  // ===== Users: DELETE =====
  // DELETE /api/admin/users/:id
  // *ต้องมี route นี้ที่ฝั่ง backend*
  async deleteUser(userId) {
    const r = await client.delete(`/api/admin/users/${userId}`);
    return r.data; // { message: 'deleted' }
  },



  async createTeacher({ username, email, password }) {
    const r = await client.post("/api/admin/teachers", { username, email, password });
    return r.data;
  },
  async listTeachers(q = "") {
    const r = await client.get("/api/admin/teachers", { params: q ? { q } : {} });
    return r.data;
  },
  async setRole(userId, role) {
    const r = await client.patch(`/api/admin/users/${userId}/role`, { role });
    return r.data;
  },
};
