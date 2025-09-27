import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      // Sidebar จะเปิดอัตโนมัติเมื่อหน้าจอมีขนาดใหญ่กว่าหรือเท่ากับ 768px
      // setIsSidebarOpen(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Overlay สำหรับ Mobile ที่ทำให้พื้นหลังมืดลง */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0
        `}
      >
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      </div>

      {/* Main content area */}
      <div
        className={`flex-grow flex flex-col transition-all duration-300 ease-in-out 
    ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}
  `}
      >
        <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main page content will be rendered here with overflow-y-auto to allow scrolling */}
        <main className="flex-grow p-4 md:p-10 lg:p-0 lg:px-0   overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}