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
    if (!id) throw new Error('Attachment ID is required for download.');
    let r;
    try {
      r = await client.get(`/api/attachments/download/${encodeURIComponent(String(id))}`, { responseType: 'blob' });
    } catch (err) {
      // Try to extract server JSON message if available. When responseType='blob',
      // axios places the body into resp.data as a Blob, so we need to read it.
      const resp = err?.response;
      if (resp && resp.data) {
        try {
          // If server sent JSON but axios treated it as blob, parse it
          if (resp.data instanceof Blob) {
            const txt = await resp.data.text();
            try {
              const json = JSON.parse(txt);
              throw new Error(json?.message || JSON.stringify(json) || 'ดาวน์โหลดไฟล์ล้มเหลว');
            } catch (parseErr) {
              // not JSON
              throw new Error(txt || (err?.message || 'ดาวน์โหลดไฟล์ล้มเหลว'));
            }
          }
        } catch (readErr) {
          // ignore and fallthrough to generic
          throw new Error(readErr?.message || (err?.message || 'ดาวน์โหลดไฟล์ล้มเหลว'));
        }
        const serverMsg = resp.data?.message || resp.data || resp.statusText;
        throw new Error(serverMsg || (err?.message || 'ดาวน์โหลดไฟล์ล้มเหลว'));
      }
      throw new Error(err?.message || 'ดาวน์โหลดไฟล์ล้มเหลว');
    }

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
  async remove(id) {
    const r = await client.delete(`/api/attachments/${encodeURIComponent(String(id))}`);
    return r.data;
  },
};

export default attachmentService;
