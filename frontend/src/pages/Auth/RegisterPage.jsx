import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  // รหัสนักศึกษา (เฉพาะ role student)
  const [studentId, setStudentId] = useState('');

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  setLoading(true);

  if (password !== confirmPassword) {
    setError("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    setLoading(false);
    return;
  }
  try {
    await register(username, email, password, studentId);
    setSuccess("ลงทะเบียนสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setStudentId('');
    setTimeout(() => navigate("/login"), 2000);
  } catch (err) {
    if (typeof err === "string") setError(err);
    else if (err?.response?.data?.message) setError(err.response.data.message);
    else if (err?.message) setError(err.message);
    else setError("เกิดข้อผิดพลาดขณะสมัครสมาชิก");
  } finally {
    setLoading(false);
  }
};
  const handleGoogleSignup = () => {
    console.log('Google signup clicked');

}
  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white/40 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden p-0
            flex flex-col lg:flex-row items-stretch">
        {/* Left side - Image Card (now part of the combined card) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:border-l lg:border-white/30">
          <div className="text-center text-gray-700">
            <div className="text-6xl mb-4">📅</div>
            <div className="text-2xl font-semibold">Appointment System</div>
            <p className="mt-2 text-lg text-gray-600">
              จัดการนัดหมายของคุณได้อย่างง่ายดายและมีประสิทธิภาพ
            </p>
            {/* Optional: Add more elements here like a small logo or additional text */}
          </div>
        </div>

        {/* Right side - Register Form (now part of the combined card) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-8">
                <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">ARS</span>
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold text-gray-900">Appointment</div>
                  <div className="text-lg font-semibold text-gray-900">Record System</div>
                </div>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Sign up</h2>
              <p className="text-lg text-gray-600">Sign up to book an appointment</p>
            </div>

            {/* Register Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 transition duration-200 bg-white/60"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="กรอกอีเมล"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 transition duration-200 bg-white/60"
                />
              </div>
               {/* Student ID (เฉพาะนักศึกษา) */}
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                    รหัสนักศึกษา
                  </label>
                  <input
                    id="studentId"
                    type="text"
                    placeholder="กรอกรหัสนักศึกษา"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200  bg-white/60"
                    inputMode="numeric"
                    pattern="^\d{10}$"
                    maxLength={10}
                  />
                </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่าน"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 pr-12 transition duration-200 bg-white/60"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="ยืนยันรหัสผ่าน"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 pr-12 transition duration-200 bg-white/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 text-center bg-green-50 p-3 rounded-lg">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
              </button>

              <div className="text-center my-4">
                <span className="text-gray-400">or</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition duration-200 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  มีบัญชีอยู่แล้ว?{' '}
                  <a href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                    เข้าสู่ระบบ
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}