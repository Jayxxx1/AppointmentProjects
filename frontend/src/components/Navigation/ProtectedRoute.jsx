import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth(); 

  if (loading) {
//loding
    return <div>กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!isAuthenticated) {
    // ถ้าผู้ใช้ไม่ได้ล็อกอิน ให้ Redirect ไปหน้า Login
    return <Navigate to="/login" replace />;
  }

  // ถ้าล็อกอินแล้ว ให้แสดง Component ลูก
  return children;
};

export default ProtectedRoute;