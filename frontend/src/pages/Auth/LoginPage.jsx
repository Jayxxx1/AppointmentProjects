import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password.trim());
      alert('เข้าสู่ระบบสำเร็จ!');
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ โปรดลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
  };

  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/40 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-8">
              <div className="w-20 h-14 rounded-full flex items-center justify-center">
                <img src="./logo/logo2.png" alt="Logo" className="w-25 h-16 relative z-10 drop-shadow-lg bg-transparent" />
              </div>
              <div className="text-left">
                <div className="text-lg font-semibold text-gray-900">Appointment</div>
                <div className="text-lg font-semibold text-gray-900">Record System</div>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Login</h2>
            <p className="text-lg text-gray-600">Nice to see you again</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 ">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="กรอกอีเมล"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-500 transition duration-200 bg-white/60"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่าน"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-12 transition duration-200 bg-white/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition duration-200"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'Sign in'}
            </button>
            
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign up now
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

