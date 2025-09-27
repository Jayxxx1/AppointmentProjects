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

export const attachmentService = {
  async list(ownerType, ownerId) {
    const r = await client.get(
      `/api/attachments/${encodeURIComponent(ownerType)}/${encodeURIComponent(String(ownerId))}`
    );
    return r.data;
  },

  async upload(ownerType, ownerId, files = []) {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    const r = await client.post(
      `/api/attachments/${encodeURIComponent(ownerType)}/${encodeURIComponent(String(ownerId))}`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return r.data;
  },

  // ✅ ดาวน์โหลดด้วย axios เพื่อส่ง Authorization header ได้
  async download(id, filename = 'download') {
    const r = await client.get(
      `/api/attachments/download/${encodeURIComponent(String(id))}`,
      { responseType: 'blob' }
    );

    // ตั้งชื่อไฟล์จาก header ถ้ามี
    let name = filename;
    const dispo = r.headers?.['content-disposition'] || '';
    const m = dispo.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
    if (m) name = decodeURIComponent(m[1].replace(/^"+|"+$/g, ''));

    const blob = new Blob([r.data], { type: r.headers?.['content-type'] || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  downloadUrl(id) {
    return `${API_URL}/api/attachments/download/${encodeURIComponent(String(id))}`;
  },
};

export default attachmentService;
