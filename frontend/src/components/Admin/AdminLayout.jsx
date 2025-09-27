import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import Header from '../Navigation/Header';


export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Optional: handle responsive sidebar behavior if needed
  useEffect(() => {
    const handleResize = () => {
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Dark overlay on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      {/* Sidebar container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0`}
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
        <main className="flex-grow p-4 md:p-10 lg:p-0 lg:px-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}