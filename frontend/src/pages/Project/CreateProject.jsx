const API_URL = import.meta.env.VITE_API_URL || '';
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const [error, setError] = useState("");

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const [userSuggestions, setUserSuggestions] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  // Files selected for the project
  const [files, setFiles] = useState([]);

  // Function to get the current user's ID from localStorage
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
    // Set the current user's ID on component mount
    setCurrentUserId(getCurrentUserId());
  }, []);

  // Search users for adding as members (students)
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

  // Load teachers list on query change
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

  const canSubmit = useMemo(
    () => name.trim() && advisorId && academicYear.trim() && !loading,
    [name, advisorId, academicYear, loading]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      // Convert file objects to just file names for storage
      const fileNames = Array.isArray(files) ? files.map((f) => f.name).filter(Boolean) : [];

      if (files && files.length) {
        // Use FormData for file upload
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('description', description.trim());
        fd.append('advisorId', advisorId);
        selectedMembers.map(m => m._id).forEach(id => fd.append('memberIds', id));
        fd.append('academicYear', academicYear.trim());
        files.forEach(f => fd.append('files', f));
        await projectService.createForm(fd);
      } else {
        // No files, use JSON payload
        await projectService.create({
          name: name.trim(),
          description: description.trim(),
          advisorId,
          memberIds: selectedMembers.map((m) => m._id),
          academicYear: academicYear.trim(),
          // files is not needed here since the fileNames variable is likely for another purpose if no files are uploaded
        });
      } // <-- This closing brace was missing!

      // SUCCESS FEEDBACK and NAVIGATION: Move outside the if/else block to run after EITHER successful API call
      setFeedbackMsg("สร้างโปรเจคสำเร็จ");
      setShowFeedback(true);
      setTimeout(() => navigate("/projects"), 900);

    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "สร้างโปรเจคไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/bg/bg.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-xs"></div>

      <div className="relative z-10 max-w-3xl w-full mx-auto px-2 sm:px-8 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-2xl px-8 py-6 shadow-xl">
          <h2 className="text-2xl font-medium">สร้างโปรเจคใหม่</h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="bg-white rounded-b-2xl shadow-xl px-8 py-7 space-y-6">
          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
          {/* Project Name */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              ชื่อโปรเจค <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ระบบนัดหมายอัจฉริยะ"
              required
              maxLength={120}
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          {/* Academic Year */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              ปีการศึกษา <span className="text-red-500">*</span>
            </label>
            {/*
              Restrict academicYear input to numeric only.  Thai academic years are four-digit numbers (เช่น 2567).
              On change we strip any non-digit characters and cap the length to 4 digits.  We also set inputMode and pattern
              to hint numeric keyboards on mobile devices.  Without this the field allowed arbitrary text which led to
              invalid data being sent to the backend.
            */}
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={academicYear}
              onChange={(e) => {
                const numeric = e.target.value.replace(/\D/g, "").slice(0, 4);
                setAcademicYear(numeric);
              }}
              placeholder="เช่น 2567"
              required
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          {/* Add Members */}
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

          {/* Selected Members */}
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

          {/* Advisor Select */}
          <div>
            <label className="block font-semibold mb-2 text-gray-700 text-base md:text-lg">
              อาจารย์ที่ปรึกษา <span className="text-red-500">*</span>
            </label>
            <select
              value={advisorId}
              onChange={(e) => setAdvisorId(e.target.value)}
              required
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50"
            >
              <option value="">เลือกอาจารย์</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.fullName || t.username || t.email}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
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

          {/* Project Files */}
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

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-5 h-5" /> สร้างโปรเจค
            </button>
          </div>
        </form>

        {/* Feedback Modal */}
        {showFeedback && (
          <FeedbackModal
            title="สำเร็จ"
            message={feedbackMsg}
            onClose={() => setShowFeedback(false)}
          />
        )}
      </div>
    </div>
  );
}
