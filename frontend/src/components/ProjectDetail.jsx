// src/pages/ProjectDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { projectService } from "../services/projectService";
import { attachmentService } from "../services/attachmentService";

// **[IMPROVEMENT]** ฟังก์ชัน Debounce สำหรับลดการยิง API ตอนกำลังพิมพ์
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const currentUserId =
    user?._id || user?.id || user?.user?._id || user?.user?.id || "";
  const currentRole = (user?.role || user?.user?.role || "student").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  // edit mode + form
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    academicYear: "",
    advisorId: "",
  });

  // advisor search
  const [advisorQuery, setAdvisorQuery] = useState("");
  const [advisorResult, setAdvisorResult] = useState([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);

  // members manage
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResult, setMemberResult] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);

  // attachments
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachErr, setAttachErr] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await projectService.get(id);
        if (!alive) return;

        setProject(data || null);
        setForm({
          name: data?.name || "",
          description: data?.description || "",
          academicYear: data?.academicYear || "",
          advisorId: data?.advisor?._id || data?.advisor || "",
        });

        // load attachments
        try {
          setAttachmentsLoading(true);
          setAttachErr("");
          const att = await attachmentService.list("project", id);
          if (alive) setAttachments(Array.isArray(att) ? att : []);
        } catch (e) {
          if (alive) setAttachErr(e?.response?.data?.message || "โหลดไฟล์แนบไม่สำเร็จ");
        } finally {
          if (alive) setAttachmentsLoading(false);
        }
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || "โหลดข้อมูลโปรเจกต์ไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const createdById = useMemo(
    () => project?.createdBy?._id || project?.createdBy || "",
    [project]
  );
  
  const isAdvisor = useMemo(
    () => String(project?.advisor?._id) === String(currentUserId),
    [project, currentUserId]
  );

  const canEdit = useMemo(
    () => currentRole === "admin" || String(createdById) === String(currentUserId) || isAdvisor,
    [currentRole, createdById, currentUserId, isAdvisor]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const refreshProject = async () => {
    const fresh = await projectService.get(id);
    setProject(fresh || null);
    setForm({
      name: fresh?.name || "",
      description: fresh?.description || "",
      academicYear: fresh?.academicYear || "",
      advisorId: fresh?.advisor?._id || fresh?.advisor || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        name: form.name?.trim(),
        description: form.description?.trim(),
        advisorId: form.advisorId || undefined,
      };
      await projectService.update(id, payload);
      await refreshProject();
      setEditMode(false);
    } catch (err) {
      setError(err?.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    const ok = window.confirm(
      "ยืนยันลบโปรเจคนี้แบบถาวร?\n\nไฟล์และนัดหมายที่ผูกกับโปรเจคอาจได้รับผลกระทบ ไม่สามารถกู้คืนได้."
    );
    if (!ok) return;
    try {
      setDeleting(true);
      await projectService.remove(id);
      navigate("/projects", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || "ลบโปรเจคไม่สำเร็จ");
      setDeleting(false);
    }
  };

  const searchAdvisor = async (query) => {
    if (!query) {
      setAdvisorResult([]);
      return;
    }
    try {
      setAdvisorLoading(true);
      const rs = await projectService.searchUsers({ q: query, role: "teacher", limit: 8 });
      setAdvisorResult(Array.isArray(rs) ? rs : []);
    } catch {
      setAdvisorResult([]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const debouncedSearchAdvisor = useCallback(debounce(searchAdvisor, 300), []);

  useEffect(() => {
    if(advisorQuery) {
      debouncedSearchAdvisor(advisorQuery);
    } else {
      setAdvisorResult([]);
    }
  }, [advisorQuery, debouncedSearchAdvisor]);


  const selectAdvisor = (u) => {
    setForm((prev) => ({ ...prev, advisorId: u._id || u.id }));
    setAdvisorResult([]);
    setAdvisorQuery(u.fullName || u.username || u.email || "");
  };

  const searchMembers = async (query) => {
    if (!query) {
      setMemberResult([]);
      return;
    }
    try {
      setMemberLoading(true);
      const rs = await projectService.searchUsers({ q: query, role: "student", limit: 8 });
      const currentIds = new Set([
        ...(project?.members || []).map((m) => String(m?._id || m)),
        String(project?.advisor?._id || project?.advisor || ""),
      ].filter(Boolean));
      const filtered = (rs || []).filter((u) => !currentIds.has(String(u._id || u.id)));
      setMemberResult(filtered);
    } catch {
      setMemberResult([]);
    } finally {
      setMemberLoading(false);
    }
  };
  
  const debouncedSearchMembers = useCallback(debounce(searchMembers, 300), [project]);

  useEffect(() => {
    if(memberQuery) {
        debouncedSearchMembers(memberQuery);
    } else {
        setMemberResult([])
    }
  }, [memberQuery, debouncedSearchMembers]);


  const addMember = async (u) => {
    try {
      await projectService.addMembers(id, [u._id || u.id]);
      await refreshProject();
      setMemberQuery("");
      setMemberResult([]);
    } catch (e) {
      setError(e?.response?.data?.message || "เพิ่มสมาชิกไม่สำเร็จ");
    }
  };
  
  const removeMember = async (uid) => {
    try {
      await projectService.removeMembers(id, [uid]);
      await refreshProject();
    } catch (e) {
      setError(e?.response?.data?.message || "ลบสมาชิกไม่สำเร็จ");
    }
  };

  const onUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploading(true);
      setAttachErr("");
      await attachmentService.upload("project", id, files);
      const att = await attachmentService.list("project", id);
      setAttachments(Array.isArray(att) ? att : []);
      e.target.value = "";
    } catch (err) {
      setAttachErr(err?.response?.data?.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };
  const onDownload = async (a) => {
    try {
      await attachmentService.download(a._id, a.originalName);
    } catch (e) {
      setAttachErr(e?.response?.data?.message || "ดาวน์โหลดไฟล์ไม่สำเร็จ");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-xl">กำลังโหลด...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur p-6 rounded-2xl shadow-xl text-center">
          <div className="mb-4 font-semibold text-gray-700">{error || "ไม่พบโปรเจกต์"}</div>
          <Link to="/projects" className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            ← กลับหน้ารายการโปรเจกต์
          </Link>
        </div>
      </div>
    );
  }
  
  if (!canEdit) {
    return (
      <div className="min-h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur p-8 rounded-2xl shadow-xl text-center border border-red-100">
          <div className="text-red-600 font-semibold mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>
          <div className="text-gray-600 mb-6">เฉพาะผู้สร้างโปรเจค, อาจารย์ที่ปรึกษา, หรือผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขโปรเจคได้</div>
          <Link to="/projects" className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            ← กลับหน้ารายการโปรเจกต์
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <defs>
            <pattern id="project-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="currentColor" />
              <rect x="8" y="8" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#project-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 p-6 lg:p-8">
        {!editMode ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-5 rounded-full -ml-12 -mb-12"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                      </div>
                      <h2 className="text-3xl font-bold">{project.name}</h2>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={deleting} className={`shadow-xl text-white px-6 py-3 rounded-full font-medium transition-all duration-300 backdrop-blur-sm flex items-center space-x-2 transform hover:scale-105 ${ deleting ? "bg-red-400 shadow-red-400/40 cursor-not-allowed" : "bg-red-500 hover:bg-red-400 shadow-red-500/50 hover:shadow-red-400/50"}`} title="ลบโปรเจค">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                      <span>{deleting ? "กำลังลบ..." : "ลบโปรเจ็กต์"}</span>
                    </button>
                    <button className="bg-cyan-500 shadow-xl shadow-cyan-500/50 hover:bg-cyan-400 hover:shadow-cyan-400/50 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 backdrop-blur-sm flex items-center space-x-2 transform hover:scale-105" onClick={() => setEditMode(true)}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                      <span>แก้ไขโปรเจ็กต์</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" /></svg>
                  ข้อมูลโปรเจ็กต์
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">รายละเอียด:</p>
                    <p className="text-gray-800">{project.description || "—"}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">ปีการศึกษา:</p>
                    <p className="text-gray-800 font-semibold">{project.academicYear}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium mb-1">อาจารย์ที่ปรึกษา:</p>
                    <p className="text-gray-800 font-semibold">{project.advisor?.fullName || project.advisor?.email || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.660.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                  สมาชิก
                </h3>
                <div className="space-y-3">
                  {(project.members || []).map((member, index) => (
                    <div key={member._id || member.id || index} className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 transform hover:scale-105 transition-all duration-300" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mr-3 text-white font-medium">
                        {(member.fullName || member.username || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-800 font-medium">{member.fullName || member.username || member.email}</span>
                    </div>
                  ))}
                  {!(project.members || []).length && (<div className="text-gray-500">— ไม่มีสมาชิก —</div>)}
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 20 20"><path d="M8 12a1 1 0 001-1V5a1 1 0 112 0v6a3 3 0 11-3-3 1 1 0 110 2 1 1 0 100 2zM5 8a5 5 0 1110 0v4a5 5 0 11-10 0V8z" /></svg>
                ไฟล์แนบของโปรเจ็กต์
              </h3>
              {attachmentsLoading ? (<div className="text-gray-500">กำลังโหลดไฟล์แนบ...</div>) : attachErr ? (<div className="text-red-600 text-sm">{attachErr}</div>) : (attachments || []).length === 0 ? (<div className="text-gray-500 italic">— ไม่มีไฟล์แนบ —</div>) : (
                <ul className="divide-y divide-gray-100">
                  {attachments.map((a) => {
                    const sizeKB = a.size ? Math.max(1, Math.round(a.size / 1024)) : null;
                    const created = a.createdAt ? new Date(a.createdAt) : null;
                    return (
                      <li key={a._id} className="py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{a.originalName}</div>
                          <div className="text-xs text-gray-500">
                            {a.mimeType || "ไฟล์"}
                            {sizeKB ? ` • ${sizeKB} KB` : ""}
                            {created ? ` • อัปโหลด ${created.toLocaleString("th-TH")}` : ""}
                          </div>
                        </div>
                        <button onClick={() => onDownload(a)} className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-500 hover:to-purple-500 hover:text-white transition-colors">ดาวน์โหลด</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <svg className="w-7 h-7 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                  แก้ไขโปรเจ็กต์
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อโปรเจ็กต์</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/50 backdrop-blur-sm" placeholder="กรอกชื่อโปรเจ็กต์" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">รายละเอียด</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/50 backdrop-blur-sm resize-none" placeholder="กรอกรายละเอียดโปรเจ็กต์" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ปีการศึกษา</label>
                  <input name="academicYear" value={form.academicYear} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">อาจารย์ที่ปรึกษา</label>
                  <div className="relative">
                    <input type="text" value={advisorQuery} onChange={(e) => setAdvisorQuery(e.target.value)} placeholder="ค้นหาอาจารย์ด้วยชื่อ/อีเมล" className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {advisorLoading && <div className="text-sm text-gray-500 absolute right-3 top-3">กำลังค้นหา...</div>}
                  </div>
                  {!!advisorResult.length && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden mt-1">
                      {advisorResult.map((u) => (
                        <button key={u._id || u.id} type="button" onClick={() => selectAdvisor(u)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3" >
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">{(u.fullName || u.username || "U").charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{u.fullName || u.username || u.email}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700">สมาชิกปัจจุบัน</div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(project?.members || []).map((m) => {
                      const mid = m?._id || m;
                      const display = m?.fullName || m?.username || m?.email || String(mid);
                      return (
                        <div key={mid} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                          <div className="min-w-0 truncate">{display}</div>
                          {String(mid) !== String(project?.createdBy) && (
                            <button type="button" onClick={() => removeMember(mid)} className="px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm">ลบ</button>
                          )}
                        </div>
                      );
                    })}
                    {!(project?.members || []).length && (<div className="text-gray-500">— ไม่มีสมาชิก —</div>)}
                  </div>
                  <div className="pt-2 relative">
                    <input type="text" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="ค้นหานักศึกษาด้วยชื่อ/อีเมล/รหัส" className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    {memberLoading && <div className="text-sm text-gray-500 absolute right-3 top-5">กำลังค้นหา...</div>}
                    {!!memberResult.length && (
                      <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden absolute w-full bg-white z-10">
                        {memberResult.map((u) => (
                          <button key={u._id || u.id} type="button" onClick={() => addMember(u)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">{(u.fullName || u.username || "S").charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{u.fullName || u.username || u.email}</div>
                              <div className="text-xs text-gray-500">{u.studentId} - {u.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700">ไฟล์แนบของโปรเจค</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(attachments || []).map((a) => (
                      <div key={a._id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-800">{a.originalName}</div>
                          <div className="text-xs text-gray-500">{a.mimeType || "ไฟล์"} • {a.size ? `${Math.max(1, Math.round(a.size / 1024))} KB` : "-"}</div>
                        </div>
                        <button type="button" onClick={() => onDownload(a)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm">ดาวน์โหลด</button>
                      </div>
                    ))}
                    {!(attachments || []).length && (<div className="text-gray-500">— ไม่มีไฟล์แนบ —</div>)}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 cursor-pointer">
                      <span>{uploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}</span>
                      <input type="file" multiple onChange={onUploadFiles} className="hidden" disabled={uploading} />
                    </label>
                    {attachErr && <div className="text-sm text-red-600">{attachErr}</div>}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={saving} className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${ saving ? "opacity-70 cursor-not-allowed" : ""}`}>
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                    ยกเลิก
                  </button>
                </div>

                {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

