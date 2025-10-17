import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Phone, Briefcase, Save, X, AlertCircle } from "lucide-react";
import { userService } from "../../services/userService"; // Uncomment and use for real API

export default function EditProfilePage() {
  const { user, setUser } = useAuth() || {};
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    department: user?.department || "",
    studentId: user?.studentId || "",
    bio: user?.bio || "",
  });

  useEffect(() => {
    setFormData({
      fullName: user?.fullName || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      department: user?.department || "",
      studentId: user?.studentId || "",
      bio: user?.bio || "",
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!formData.fullName.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!formData.email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    try {
      setLoading(true);
      // Uncomment below for real API call
      // await userService.updateProfile(formData);
      // setUser({ ...user, ...formData });
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess("บันทึกข้อมูลเรียบร้อยแล้ว");
      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* BG image layer */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed blur-sm opacity-30"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-white/80 backdrop-blur-sm" />

      <div className="relative z-10 max-w-3xl w-full mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="bg-white border-b border-gray-200 px-6 sm:px-8 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">แก้ไขโปรไฟล์</h2>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
                ยกเลิก
              </Link>
            </div>
          </div>

          <div className="bg-white px-6 sm:px-8 py-8">
            {/* Alert Messages */}
            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {/* Profile Avatar Section */}
            <div className="flex flex-col items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
                  {formData.fullName?.charAt(0) || "U"}
                </div>
              </div>
              <p className="text-sm text-gray-600">อัปโหลดรูปโปรไฟล์ (เร็วๆ นี้)</p>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ-นามสกุล <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกชื่อ-นามสกุล"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                    placeholder="username"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">ชื่อผู้ใช้ไม่สามารถเปลี่ยนแปลงได้</p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกอีเมล"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรศัพท์
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกเบอร์โทรศัพท์"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  สาขา/แผนก
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกสาขา/แผนก"
                  />
                </div>
              </div>

              {/* Student ID */}
              <div>
                <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสนักศึกษา
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="studentId"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    className="w-full pl-4 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="กรอกรหัสนักศึกษา"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  ข้อมูลเพิ่มเติม
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="เขียนข้อมูลเกี่ยวกับตัวคุณ..."
                  rows={3}
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
