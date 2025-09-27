import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users as UsersIcon, CalendarClock, FolderGit } from 'lucide-react';

export default function AdminSidebar({ isSidebarOpen, toggleSidebar }) {
  const navItems = [
    { name: 'แดชบอร์ด', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, color: 'from-blue-500 to-indigo-500' },
    { name: 'ผู้ใช้', path: '/admin/users', icon: <UsersIcon className="w-5 h-5" />, color: 'from-purple-500 to-pink-500' },
    { name: 'นัดหมายทั้งหมด', path: '/admin/appointments', icon: <CalendarClock className="w-5 h-5" />, color: 'from-green-500 to-emerald-500' },
    { name: 'โปรเจคทั้งหมด', path: '/admin/projects', icon: <FolderGit className="w-5 h-5" />, color: 'from-orange-500 to-amber-500' },
  ];

  return (
    <>
      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 min-h-screen bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-in-out w-72 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center p-6 border-b border-gray-200/50 justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          {/* Logo */}
          <Link to="/" onClick={toggleSidebar} className="flex items-center gap-2">
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <img src="/logo/logo2.png" alt="Logo" className="w-10 h-10 relative z-10 drop-shadow-lg" />
            </div>
            <div className="ml-3 text-sm font-bold text-gray-800 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Panel
              </span>
            </div>
          </Link>
        </div>
        <nav className="flex-grow mt-6 px-3 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name} className="transform transition-all duration-200">
                <NavLink
                  to={item.path}
                  onClick={toggleSidebar}
                  className={({ isActive }) =>
                    `group flex items-center py-3 px-4 text-gray-700 rounded-xl transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                        : 'hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="mr-3 flex-shrink-0">{item.icon}</span>
                  <span className="whitespace-nowrap text-sm font-medium">{item.name}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 min-h-screen bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl z-40 transition-[width] duration-700 ease-in-out fixed top-0 left-0 ${isSidebarOpen ? 'w-72' : 'w-20'}`}
      >
        <div className={`flex items-center border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 transition-[padding] duration-700 ${isSidebarOpen ? 'p-6' : 'p-4 justify-center'}`}>
          <Link to="/" onClick={toggleSidebar} className="flex items-center gap-3">
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <img src="/logo/logo2.png" alt="Logo" className={`relative z-10 drop-shadow-lg transition-all duration-300 rounded-xl ${isSidebarOpen ? 'w-12 h-12' : 'w-10 h-10'}`} />
            </div>
            {isSidebarOpen && (
              <div className="ml-4 text-sm font-bold text-gray-800 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Panel
                </span>
              </div>
            )}
          </Link>
        </div>
        <nav className="flex-grow mt-6 px-3 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name} className="transform transition-all duration-200">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `group flex items-center py-4 px-4 text-gray-700 rounded-xl transition-all duration-300 relative overflow-hidden ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                        : 'hover:bg-gray-50'
                    } ${isSidebarOpen ? 'justify-start' : 'justify-center'}`
                  }
                >
                  <span className={`${isSidebarOpen ? 'mr-4' : ''} flex-shrink-0`}>{item.icon}</span>
                  {isSidebarOpen && (
                    <span className="whitespace-nowrap text-base font-medium">
                      {item.name}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}