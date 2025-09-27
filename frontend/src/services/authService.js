import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL;           
const API_URL = `${BASE}/api/auth/`;

const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}register`, userData);
    return response.data;
  } catch (error) {
    const serverMessage = error.response?.data?.message;
    let msg = serverMessage || 'เกิดข้อผิดพลาดในการลงทะเบียน';
    if (msg.includes('Path `password`')) {
      msg = 'รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร';
    }
    throw msg;
  }
};

const login = async ({ email, password }) => {
  try {
    const response = await axios.post(`${API_URL}login`, { email, password });
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    let msg;
    if (status === 401) {
      msg = serverMessage;
    } else {
      msg = serverMessage || 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์';
    }
    throw msg;
  }
};

export default {
  register,
  login,
};
