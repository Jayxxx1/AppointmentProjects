import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);     // user ต้องมี role มาด้วย
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // โหลดจาก localStorage โครง { user, token }
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user && parsed?.token) {
          setUser(parsed.user);            // parsed.user.role ต้องมี
          setToken(parsed.token);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Login: เก็บ { user, token } ลง localStorage (user ต้องมี role)
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      if (data?.user && data?.token) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data));
      } else {
        throw new Error('Invalid login response');
      } 
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register → auto login
  const register = useCallback(async (username, email, password, studentId, fullName = '') => {
    setLoading(true);
    try {
      // ส่งข้อมูลเพิ่มเติมไปยัง backend เช่น studentId และ fullName
      const data = await authService.register({ username, email, password, studentId, fullName });
      // สำเร็จแล้วทำการ login อัตโนมัติ
      if (data) await login(email, password);
      return data;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
  }, []);

  // ---------- flags สำหรับ guard ----------
  const isAuthenticated = !!user && !!token;
  const role = user?.role || null;
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isAuthenticated,
        isAdmin,
        isTeacher,
        isStudent,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
