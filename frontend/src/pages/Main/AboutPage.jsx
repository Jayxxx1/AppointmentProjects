import React from "react";
import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';
import { IoMdInformationCircleOutline } from "react-icons/io";


import { Calendar, Clock, Users, Bell, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  const { isAuthenticated, logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-sky-50 text-slate-800">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">A</div>
            <span className="font-semibold">Appointment & Meeting</span>
          </div>
          {!isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 rounded-xl border hover:bg-slate-50">เข้าสู่ระบบ</Link>
              <Link to="/register" className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700">สมัครใช้งานฟรี</Link>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div> */}

              <div className="text-gray-700">
                <span className="text-sm text-gray-500">สวัสดี,</span>
                <br />
                <strong className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {user?.username}
                </strong>
              </div>

            </div>
          )}
        </div>
</header>
      </div>
  
  );
}
