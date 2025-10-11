const API_URL = import.meta.env.VITE_API_URL || '';
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherService } from "../../services/teacherService.js";
import { projectService } from "../../services/projectService.js";
import FeedbackModal from "../../components/Modal/FeedbackModal.jsx";
import { Users, GraduationCap, PlusCircle } from "lucide-react";

export default function CreateProject() {
  const navigate = useNavigate();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [q, setQ] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
  const [errors, setErrors] = useState({});

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const [userSuggestions, setUserSuggestions] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const [files, setFiles] = useState([]);

  const getCurrentUserId = () => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.user?._id || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setCurrentUserId(getCurrentUserId());
  }, []);

  const handleSearchUsers = async (text) => {
    if (text.trim().length < 2) {
      setUserSuggestions([]);
      return;
    }
    try {
      const results = await projectService.searchUsers({
        q: text,
        role: 'student',
        excludeIds: currentUserId ? [currentUserId] : [],
        academicYear: academicYear.trim() || undefined,
      });
      setUserSuggestions(results);
    } catch {
      setUserSuggestions([]);
    }
  };

  const addMember = (u) => {
    if (!selectedMembers.some(member => member._id === u._id)) {
      setSelectedMembers((prev) => [...prev, u]);
    }
    setUserSuggestions([]);
    setUserSearchTerm("");
  };

  const removeMember = (uid) => {
    setSelectedMembers((prev) => prev.filter((member) => member._id !== uid));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingTeachers(true);
        const data = await teacherService.list(q.trim());
        if (!alive) return;
        setTeachers(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setTeachers([]);
      } finally {
        if (alive) setLoadingTeachers(false);
      }
    })();
    return () => { alive = false; };
  }, [q]);

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "กรุณากรอกชื่อโปรเจค";

    const year = parseInt(academicYear.trim(), 10);
    if (!academicYear.trim() || !/^\d{4}$/.test(academicYear.trim())) {
      newErrors.academicYear = "กรุณากรอกปีการศึกษาเป็นตัวเลข 4 หลัก";
    } else if (year < 2567 || year > 2570) {
      newErrors.academicYear = "ปีการศึกษาต้องไม่ต่ำกว่าปี 2567 และไม่เกิน 2570";
    }

    if (!advisorId) newErrors.advisorId = "กรุณาเลือกอาจารย์ที่ปรึกษา";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    try {
      const memberIds = selectedMembers.map((m) => m._id);

      if (files && files.length) {
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('description', description.trim());
        fd.append('advisorId', advisorId);
        memberIds.forEach(id => fd.append('memberIds', id));
        fd.append('academicYear', academicYear.trim());
        files.forEach(f => fd.append('files', f));
        await projectService.createForm(fd);
      } else {
        await projectService.create({
          name: name.trim(),
          description: description.trim(),
          advisorId,
          memberIds,
          academicYear: academicYear.trim(),
        });
      }

      setFeedbackMsg("สร้างโปรเจคสำเร็จ");
      setShowFeedback(true);
      setTimeout(() => navigate("/projects"), 900);

    } catch (err) {
      setErrors({ form: err?.response?.data?.message || err?.message || "สร้างโปรเจคไม่สำเร็จ" });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/bg/bg.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xs"></div>

      <div className="relative z-10 max-w-3xl w-full mx-auto px-2 sm:px-8 py-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-2xl px-8 py-6 shadow-xl">
          <h2 className="text-2xl font-medium">สร้างโปรเจคใหม่</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow-xl px-8 py-7 space-y-6">
          {errors.form && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
              {errors.form}
            </div>
          )}
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              ชื่อโปรเจค <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if(errors.name) setErrors(p => ({...p, name: ''})); }}
              placeholder="เช่น ระบบนัดหมายอัจฉริยะ"
              required
              maxLength={120}
              className={`w-full border px-4 py-3 rounded-xl focus:ring-2 bg-gray-50 ${errors.name ? 'border-red-500' : 'focus:ring-blue-500'}`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              ปีการศึกษา <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={academicYear}
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "").slice(0, 4);
                setAcademicYear(numeric);
                if(errors.academicYear) setErrors(p => ({...p, academicYear: ''}));
              }}
              placeholder="เช่น 2567"
              required
              className={`w-full border px-4 py-3 rounded-xl focus:ring-2 bg-gray-50 ${errors.academicYear ? 'border-red-500' : 'focus:ring-blue-500'}`}
            />
            {errors.academicYear && <p className="text-red-500 text-sm mt-1">{errors.academicYear}</p>}
          </div>
          
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              เพิ่มสมาชิก (นักศึกษา)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหานักศึกษาด้วยชื่อหรืออีเมล..."
                className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
                value={userSearchTerm}
                onChange={(e) => {
                  setUserSearchTerm(e.target.value);
                  if (e.target.value.trim().length > 1) {
                    handleSearchUsers(e.target.value);
                  } else {
                    setUserSuggestions([]);
                  }
                }}
              />
              {userSuggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {userSuggestions.map((user) => (
                    <li
                      key={user._id}
                      onClick={() => addMember(user)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                    >
                      <span>{user.fullName || user.username || user.email}</span>
                      <button
                        type="button"
                        className="text-blue-500 hover:underline"
                      >
                        เพิ่ม
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 font-semibold text-gray-700">สมาชิกที่เลือก:</div>
              <ul className="flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <li key={m._id} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                    <span className="mr-2">{m.fullName || m.username || m.email}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(m._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              อาจารย์ที่ปรึกษา <span className="text-red-500">*</span>
            </label>
            <select
              value={advisorId}
              onChange={(e) => { setAdvisorId(e.target.value); if(errors.advisorId) setErrors(p => ({...p, advisorId: ''})); }}
              required
              className={`w-full border px-4 py-3 rounded-xl focus:ring-2 bg-gray-50 ${errors.advisorId ? 'border-red-500' : 'focus:ring-blue-500'}`}
            >
              <option value="">เลือกอาจารย์</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName || t.username || t.email}
                </option>
              ))}
            </select>
            {errors.advisorId && <p className="text-red-500 text-sm mt-1">{errors.advisorId}</p>}
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              รายละเอียดโปรเจค
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับโปรเจค"
              rows="3"
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              ไฟล์ประจำโปรเจค
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                ไฟล์ที่เลือก: {files.map((f) => f.name).join(', ')}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-5 h-5" /> {loading ? "กำลังสร้าง..." : "สร้างโปรเจค"}
            </button>
          </div>
        </form>

        {showFeedback && (
          <FeedbackModal
            open={showFeedback}
            message={feedbackMsg}
            onClose={() => setShowFeedback(false)}
            autoClose={1500}
          />
        )}
      </div>
    </div>
  );
}