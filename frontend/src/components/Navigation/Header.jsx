import { useState, useEffect } from 'react';
import { Link , useNavigate} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiLogOut , FiUserPlus, FiLogIn, FiBell, FiSearch, FiChevronDown, FiX } from "react-icons/fi";
import { CiSettings } from "react-icons/ci";


export default function Header({ isSidebarOpen, toggleSidebar }) { 
  const [searchValue, setSearchValue] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const {isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  // A useEffect to log the authentication state for debugging purposes
  // useEffect(() => {
  //   console.log('Authentication state changed. isAuthenticated:', isAuthenticated);
  //   if (user) {
  //     console.log('User:', user.username);
  //   }
  // }, [isAuthenticated, user]);

  const handleLogout =()=>{
    logout();
    navigate('/login');
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50 px-4 py-3 md:px-6 md:py-4 transition-all duration-300">
      {/* Glass morphism background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-white/50 to-purple-50/50"></div>
      
      <div className="relative z-10 flex items-center w-full">
        
        {/* Hamburger Menu Button */}
        <button
          onClick={toggleSidebar}
          className="group p-3 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 rounded-xl transition-all duration-300 flex-shrink-0 hover:scale-110 hover:shadow-md"
          title={isSidebarOpen ? "ยุบ Sidebar" : "ขยาย Sidebar"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2} 
            stroke="currentColor" 
            className="w-6 h-6 text-gray-700 transition-all duration-300 group-hover:text-blue-600 group-hover:rotate-180" 
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>

        {/* Enhanced Search Bar */}
        <div className="relative flex-grow mx-50 hidden md:block max-w-sm lg:max-w-md ml-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400 transition-colors duration-200" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="block w-full pl-12 pr-6 py-3 border-2 border-gray-200/50 rounded-2xl leading-5 bg-white/80 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
            placeholder="🔍 ค้นหาอาจารย์ กลุ่ม นัดหมาย..."
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>

        {/* Right Side - Enhanced Controls */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 ml-auto">
          
          {/* Enhanced Language Selector */}
          <div className="relative group">
            <select className="appearance-none bg-white/90 backdrop-blur-sm border-2 border-gray-200/50 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 pr-8 sm:pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 cursor-pointer hover:bg-white hover:shadow-md">
              <option>🇹🇭 TH</option>
              <option>🇺🇸 EN</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 pointer-events-none">
              <FiChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
            </div>
          </div>

          {/* Enhanced Notification Bell */}
          <button className="relative group p-2.5 sm:p-3 text-gray-500 hover:text-white hover:bg-gradient-to-r hover:from-red-400 hover:to-pink-500 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/25">
            <FiBell className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:rotate-12" />
            {/* Enhanced notification badge */}
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse shadow-lg">
              3
            </span>
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-400 rounded-full animate-ping opacity-75"></span>
          </button>

          {/* Enhanced Auth Section */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Desktop view: User profile and Logout button with text */}
              <div className="hidden md:flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 border-2 border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="text-gray-700">
                    <span className="text-sm text-gray-500">สวัสดี,</span>
                    <br />
                    <strong className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                     คุณ {user?.fullName }
                    </strong>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="group bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 flex items-center space-x-2"
                >
                  <FiLogOut className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </button>
              </div>

              {/* Mobile view: Profile button and dropdown menu */}
              <div className="relative flex md:hidden">
                <button 
                  onClick={toggleProfileMenu} 
                  className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md hover:scale-105 transition-all duration-200"
                >
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute top-12 right-0 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 overflow-hidden transform animate-fade-in-down origin-top">
                    <div className="flex flex-col p-4 border-b border-gray-200/50">
                      <span className="text-gray-500 text-xs">สวัสดีคุณ </span>
                      <strong className="font-semibold text-gray-800 truncate">{user?.username}</strong>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center space-x-2 p-4 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <FiUserPlus className="w-5 h-5" />
                      <span>โปรไฟล์ของฉัน</span>
                    </Link>

                     <Link
                      to="/profilesetting"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center space-x-2 p-4 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <CiSettings  className="w-5 h-8 " />
                      <span>โปรไฟล์ของฉัน</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 p-4 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
                    >
                      <FiLogOut className="w-5 h-5" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex space-x-2 sm:space-x-3">
              {/* Desktop view: Login/Register buttons with text */}
              <div className="hidden md:flex space-x-2 sm:space-x-3">
                <Link
                  to="/login"
                  className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center space-x-2"
                >
                  <FiLogIn className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
                <Link
                  to="/register"
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/25 flex items-center space-x-2"
                >
                  <FiUserPlus className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>ลงทะเบียน</span>
                </Link>
              </div>

              {/* Mobile view: Icon-only buttons */}
              <div className="flex md:hidden space-x-2">
                <Link
                  to="/login"
                  className="group p-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
                  title="เข้าสู่ระบบ"
                >
                  <FiLogIn className="w-5 h-5" />
                </Link>
                <Link
                  to="/register"
                  className="group p-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/25"
                  title="ลงทะเบียน"
                >
                  <FiUserPlus className="w-5 h-5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar - Shows when needed */}
      <div className="md:hidden mt-3 relative animate-slide-down">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FiSearch className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="block w-full pl-12 pr-6 py-3 border-2 border-gray-200/50 rounded-2xl leading-5 bg-white/80 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 shadow-sm"
          placeholder="🔍 ค้นหาอาจารย์ กลุ่ม นัดหมาย..."
        />
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }

        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
      `}</style>
    </header>
  );
}
