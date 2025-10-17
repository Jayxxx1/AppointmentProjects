import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL;           
const API_URL = `${BASE}/api/auth/`;

const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}register`, userData);
    return response.data;
  } catch (error) {
    // **[REFACTOR]** โยน error object ทั้งหมดออกไปให้ Component จัดการ
    const serverMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดในการลงทะเบียน';
    if (serverMessage.includes('Path `password`')) {
      error.message = 'รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร';
    } else {
      error.message = serverMessage;
    }
    throw error;
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
    // **[REFACTOR]** โยน error object ทั้งหมดออกไปให้ Component จัดการ
    const serverMessage = error.response?.data?.message || 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์';
    error.message = serverMessage;
    throw error;
  }
};

export default {
  register,
  login,
};

