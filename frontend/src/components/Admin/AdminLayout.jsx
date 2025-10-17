import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import Header from '../Navigation/Header';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';


export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const needsFullName = !!user && !(user.fullName && user.fullName.trim());
  const isOnProfilePage = location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const showOverlay = needsFullName && !isOnProfilePage;
  const goToProfile = () => navigate('/profile');

  // Optional: handle responsive sidebar behavior if needed
  useEffect(() => {
    const handleResize = () => {
      // auto-open on larger screens
      const shouldBeOpen = window.innerWidth >= 768;
      setIsSidebarOpen(shouldBeOpen);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // Make the layout container background transparent so child pages can render their own backgrounds
    <div className="flex h-screen bg-transparent">
      {/* Dark overlay on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      {/* Sidebar container */}
      <div
        id="admin-sidebar-container"
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0`}
        aria-hidden={!isSidebarOpen}
      >
        <AdminSidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>
      {/* Main content area */}
      <div
        className={`flex-grow flex flex-col transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}
      >
        {/* Top header (can show user info) */}
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        {/* Global overlay to require fullName before using the admin area */}
  {showOverlay && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">กรุณากรอกข้อมูลโปรไฟล์</h2>
                </div>
                <p className="text-gray-600 text-sm">คุณต้องเพิ่มชื่อและนามสกุลก่อนใช้งานระบบ</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-sm text-gray-700">โปรดไปที่หน้าข้อมูลโปรไฟล์เพื่อตั้งชื่อ-นามสกุลของคุณ</div>
                <div className="flex gap-3">
                  <button onClick={goToProfile} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium">ไปที่โปรไฟล์</button>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-grow p-4 md:p-10 lg:p-0 lg:px-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}