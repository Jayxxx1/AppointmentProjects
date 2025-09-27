// src/pages/AppointmentDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { appointmentService } from "../services/appointmentService";
import { attachmentService } from "../services/attachmentService";

import {
  AiFillCalendar,
  AiFillClockCircle,
  AiFillEdit,
  AiFillSave,
  AiFillCloseCircle
} from "react-icons/ai";
import {
  MdLocationOn,
  MdPerson,
  MdDescription,
  MdVideoCall,
  MdMeetingRoom,
  MdNotes,
  MdWork
} from "react-icons/md";
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline
} from "react-icons/io5";
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachErr, setAttachErr] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    meetingType: "online",
    location: "",
    meetingNotes: "",
    participants: [],
  });
  const [error, setError] = useState("");

  // Current user for permission checks
  const { user } = useAuth();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await appointmentService.get(id);
        if (!alive) return;
        setAppointment(data);
        setForm({
          title: data.title || "",
          description: data.description || "",
          date: data.date || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          meetingType: data.meetingType || "online",
          location: data.location || "",
          meetingNotes: data.meetingNotes || "",
          participants: (data.participants || []).map((p) => p._id),
        });
        // fetch attachments for this appointment
        try {
          setAttachmentsLoading(true);
          const items = await attachmentService.list('appointment', id);
          if (!alive) return;
          setAttachments(Array.isArray(items) ? items : (items?.items || []));
          setAttachErr("");
        } catch (e) {
          if (!alive) return;
          setAttachments([]);
          setAttachErr(e?.response?.data?.message || e?.message || "โหลดไฟล์แนบไม่สำเร็จ");
        } finally {
          if (alive) setAttachmentsLoading(false);
        }
      } catch (err) {
        if (!alive) return;
        setError(
          err?.response?.data?.message || err?.message || "ไม่พบข้อมูลนัดหมาย"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await appointmentService.update(id, {
        title: form.title,
        description: form.description,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        meetingType: form.meetingType,
        location: form.location,
        meetingNotes: form.meetingNotes,
        participants: form.participants,
      });
      setEditMode(false);
      const updated = await appointmentService.get(id);
      setAppointment(updated);
      setForm({
        title: updated.title || "",
        description: updated.description || "",
        date: updated.date || "",
        startTime: updated.startTime || "",
        endTime: updated.endTime || "",
        meetingType: updated.meetingType || "online",
        location: updated.location || "",
        meetingNotes: updated.meetingNotes || "",
        participants: (updated.participants || []).map((p) => p._id),
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "บันทึกข้อมูลไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'approved':
        return <IoCheckmarkCircleOutline className="text-green-500 text-xl" />;
      case 'cancelled':
      case 'rejected':
        return <IoCloseCircleOutline className="text-red-500 text-xl" />;
      case 'pending':
      default:
        return <IoTimeOutline className="text-yellow-500 text-xl" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'approved':
        return 'from-green-500 to-emerald-500';
      case 'cancelled':
      case 'rejected':
        return 'from-red-500 to-pink-500';
      case 'pending':
      default:
        return 'from-yellow-500 to-amber-500';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'ยืนยันแล้ว';
      case 'approved':
        return 'อนุมัติแล้ว';
      case 'cancelled':
        return 'ยกเลิกแล้ว';
      case 'rejected':
        return 'ปฏิเสธแล้ว';
      case 'pending':
        return 'รอการยืนยัน';
      default:
        return status || 'ไม่ระบุ';
    }
  };

  // กำหนดรายชื่อผู้เข้าร่วม (สมาชิกโปรเจคและอาจารย์ประจำกลุ่ม)
  const attendees = React.useMemo(() => {
    if (!appointment || !appointment.project) return [];
    const list = [];
    // เพิ่มสมาชิกในโปรเจค
    if (Array.isArray(appointment.project.members)) {
      list.push(...appointment.project.members);
    }
    // เพิ่มอาจารย์ที่ปรึกษา
    if (appointment.project.advisor) {
      list.push(appointment.project.advisor);
    }
    // กำจัดตัวซ้ำตาม _id
    const map = new Map();
    for (const u of list) {
      if (!u || !u._id) continue;
      if (!map.has(u._id)) map.set(u._id, u);
    }
    return Array.from(map.values());
  }, [appointment]);

  if (loading) {
    return (
      <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen">
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gradient-to-r from-blue-500 to-purple-500"></div>
              <span className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                กำลังโหลด...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen">
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <div className="text-xl text-red-600 font-semibold">
              {error || "ไม่พบข้อมูลนัดหมาย"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ปุ่มขอยกเลิกนัดหมาย (ลบจริง)
  const handleCancelAppointment = async () => {
    try {
      const ok = window.confirm(
        "ยืนยันการขอยกเลิกนัดหมายนี้หรือไม่?\n\nการยกเลิกจะลบนัดหมายออกจากระบบทันที"
      );
      if (!ok) return;
      await appointmentService.remove(id);
      navigate("/appointments", { replace: true });
    } catch (e) {
      setError(e?.response?.data?.message || "ยกเลิกนัดหมายไม่สำเร็จ");
    }
  };

  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen">
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {!editMode ? (
          // View Mode
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              {/* Status Bar */}
              <div className={`h-2 bg-gradient-to-r ${getStatusColor(appointment.status)}`}></div>

              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      {appointment.title}
                    </h2>
                    <div className="flex items-center mb-4">
                      {getStatusIcon(appointment.status)}
                      <span className="ml-2 font-medium text-gray-700">
                        {getStatusText(appointment.status)}
                      </span>
                    </div>
                  </div>
                  {/* Show controls only to creator or admin */}
                  {(user?.role === 'admin' ||
                    (appointment?.createBy?._id?.toString() === user?._id?.toString()) ||
                    (appointment?.createBy?._id?.toString() === user?.id?.toString())) && (
                      <div className="flex items-center gap-2">
                        {/* 🔴 ขอยกเลิกนัดหมาย (ดีไซน์เดียวกับปุ่มเดิม) */}
                        <button
                          onClick={handleCancelAppointment}
                          className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                          title="ขอยกเลิกนัดหมาย"
                        >
                          <AiFillCloseCircle className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                          <span>ขอยกเลิกนัดหมาย</span>
                        </button>

                        {/* ✏️ แก้ไขนัดหมาย */}
                        <button
                          onClick={() => setEditMode(true)}
                          className="group flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                          <AiFillEdit className="text-xl mr-2 group-hover:rotate-12 transition-transform duration-300" />
                          <span>แก้ไขนัดหมาย</span>
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Details Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Time & Date Card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <AiFillCalendar className="text-blue-500 mr-3" />
                  วันที่และเวลา
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <AiFillCalendar className="text-purple-500 mr-3" />
                    <span className="font-medium">{appointment.date}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <AiFillClockCircle className="text-green-500 mr-3" />
                    <span>{appointment.startTime} - {appointment.endTime}</span>
                  </div>
                </div>
              </div>

              {/* Meeting Type & Location Card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  {appointment.meetingType === 'online' ?
                    <MdVideoCall className="text-blue-500 mr-3" /> :
                    <MdMeetingRoom className="text-orange-500 mr-3" />
                  }
                  ประเภทการประชุม
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    {appointment.meetingType === 'online' ?
                      <MdVideoCall className="text-blue-500 mr-3" /> :
                      <MdMeetingRoom className="text-orange-500 mr-3" />
                    }
                    <span className="font-medium">
                      {appointment.meetingType === 'online' ? 'ออนไลน์' : 'ออฟไลน์'}
                    </span>
                  </div>
                  {appointment.location && (
                    <div className="flex items-center text-gray-700">
                      <MdLocationOn className="text-red-500 mr-3" />
                      <span>{appointment.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description Card */}
            {appointment.description && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <MdDescription className="text-indigo-500 mr-3" />
                  รายละเอียด
                </h3>
                <p className="text-gray-700 leading-relaxed">{appointment.description}</p>
              </div>
            )}

            {/* Project Card */}
            {appointment.project && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <MdWork className="text-teal-500 mr-3" />
                  โปรเจค
                </h3>
                <p className="text-gray-700 font-medium">{appointment.project.name || "-"}</p>
              </div>
            )}

            {/* Meeting Notes Card */}
            {appointment.meetingNotes && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <MdNotes className="text-amber-500 mr-3" />
                  หมายเหตุ
                </h3>
                <p className="text-gray-700 leading-relaxed">{appointment.meetingNotes}</p>
              </div>
            )}

            {/* Attachments Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-3 text-pink-500" viewBox="0 0 20 20" fill="currentColor"><path d="M8 12a1 1 0 001-1V5a1 1 0 112 0v6a3 3 0 11-3-3 1 1 0 110 2 1 1 0 100 2zM5 8a5 5 0 1110 0v4a5 5 0 11-10 0V8z" /></svg>
                ไฟล์แนบของนัดหมาย
              </h3>
              {attachmentsLoading ? (
                <div className="text-gray-500">กำลังโหลดไฟล์แนบ...</div>
              ) : attachErr ? (
                <div className="text-red-600 text-sm">{attachErr}</div>
              ) : attachments.length === 0 ? (
                <div className="text-gray-500 italic">— ไม่มีไฟล์แนบ —</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attachments.map((a) => {
                    const onDownload = () => attachmentService.download(a._id, a.originalName);
                    const sizeKB = a.size ? Math.max(1, Math.round(a.size / 1024)) : null;
                    const created = a.createdAt ? new Date(a.createdAt) : null;
                    const expire = a.expireAt ? new Date(a.expireAt) : null;
                    return (
                      <li key={a._id} className="py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{a.originalName}</div>
                          <div className="text-xs text-gray-500">
                            {a.mimeType || 'ไฟล์'}{sizeKB ? ` • ${sizeKB} KB` : ''}{created ? ` • อัปโหลด ${created.toLocaleString('th-TH')}` : ''}{expire ? ` • หมดอายุ ${expire.toLocaleString('th-TH')}` : ''}
                          </div>
                        </div>
                        <button onClick={onDownload} className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90">
                          ดาวน์โหลด
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Participants Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <MdPerson className="text-pink-500 mr-3" />
                ผู้เข้าร่วม ({attendees.length} คน)
              </h3>
              <div className="space-y-2">
                {attendees.length > 0 ? (
                  attendees.map((u) => {
                    const initial = (u.fullName || u.username || u.email || 'U').charAt(0).toUpperCase();
                    let displayName = '';
                    if (u.role === 'student') {
                      const sid = u.studentId ? `${u.studentId} ` : '';
                      displayName = `${sid}${u.fullName || u.username || u.email} (นักศึกษา)`;
                    } else if (u.role === 'teacher') {
                      displayName = `${u.fullName || u.username || u.email} (อาจารย์)`;
                    } else {
                      displayName = u.fullName || u.username || u.email;
                    }
                    return (
                      <div key={u._id} className="flex items-center p-3 bg-gray-50/80 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                          {initial}
                        </div>
                        <span className="text-gray-700 font-medium">{displayName}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic">ไม่มีผู้เข้าร่วม</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                แก้ไขนัดหมาย
              </h2>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    หัวข้อนัดหมาย *
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="กรอกหัวข้อนัดหมาย"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    รายละเอียด
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="กรอกรายละเอียดนัดหมาย"
                  />
                </div>

                {/* Date and Time Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      วันที่ *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เวลาเริ่มต้น *
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เวลาสิ้นสุด *
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={form.endTime}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                </div>

                {/* Meeting Type and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ประเภทการประชุม
                    </label>
                    <select
                      name="meetingType"
                      value={form.meetingType}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    >
                      <option value="online">ออนไลน์</option>
                      <option value="offline">ออฟไลน์</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      สถานที่
                    </label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="กรอกสถานที่"
                    />
                  </div>
                </div>

                {/* Meeting Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    หมายเหตุ
                  </label>
                  <textarea
                    name="meetingNotes"
                    value={form.meetingNotes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="กรอกหมายเหตุเพิ่มเติม"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <AiFillSave className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                    <span>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    disabled={saving}
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <AiFillCloseCircle className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                    <span>ยกเลิก</span>
                  </button>

                  {(user?.role === 'admin' ||
                    (appointment?.createBy?._id?.toString() === user?._id?.toString()) ||
                    (appointment?.createBy?._id?.toString() === user?.id?.toString())) && (
                      <button
                        type="button"
                        onClick={handleCancelAppointment}
                        className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        title="ขอยกเลิกนัดหมาย"
                      >
                        <AiFillCloseCircle className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                        <span>ขอยกเลิกนัดหมาย</span>
                      </button>
                    )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
