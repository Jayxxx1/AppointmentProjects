import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import RescheduleModal from './Modal/RescheduleModal';
import RejectModal from './Modal/RejectModal';
import SummaryModal from './Modal/SummaryModal';
import RejectRescheduleModal from './Modal/RejectRescheduleModal'; // Import the new modal
import NextAppointmentInfoModal from './Modal/NextAppointmentInfoModal';
import CancelReasonModal from './Modal/CancelReasonModal';
import LoadingOverlay from './LoadingOverlay';
import TimePicker from './TimePicker.jsx';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showRejectRescheduleModal, setShowRejectRescheduleModal] = useState(false); // State for the new modal
  const [showNextInfoModal, setShowNextInfoModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [nextInfo, setNextInfo] = useState({ previous: null, summary: null });
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
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  // Admin status management
  const [adminStatus, setAdminStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Current user for permission checks
  const { user } = useAuth();

  const uid = user?._id?.toString() || user?.id?.toString();
  const isCreator = appointment?.createBy?._id?.toString() === uid || appointment?.createBy?._id?.toString() === user?.id?.toString();
  const isAdvisor = appointment?.project?.advisor?._id?.toString() === uid || appointment?.project?.advisor?._id?.toString() === user?.id?.toString();
  const isAdmin = user?.role === 'admin';
  const isProjectMember = appointment?.project?.members?.some(member => member._id.toString() === uid);

  // lock actions for everyone except admin
  const isLocked = appointment && ['cancelled', 'rejected'].includes((appointment.status || '').toLowerCase()) && !isAdmin;
  // After advisor decision (approved or rejected)
  const showOnlyComplete = appointment && ['approved', 'rejected'].includes((appointment.status || '').toLowerCase()) && (isAdvisor || isAdmin);

  // Follow-up helper flags
  const isFollowUp = Boolean(appointment?.isNextAppointment || appointment?.previousAppointment);
  const appointmentCreatorId = appointment?.createBy?._id || appointment?.createBy;
  const projectAdvisorId = appointment?.project?.advisor?._id || appointment?.project?.advisor;
  const isAdvisorCreatedFollowUp = isFollowUp && String(appointmentCreatorId) === String(projectAdvisorId);
  const participantCanApproveFollowUp = (isProjectMember || isCreator) && isFollowUp;
  const advisorCanApprove = isAdvisor && !isAdvisorCreatedFollowUp;

  // Debug info for rapid troubleshooting

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await appointmentService.get(id);
        if (!alive) return;
        setAppointment(data);
        setAdminStatus(data?.status || '');
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
          err?.response?.data?.message || err?.message || "เกิดข้อผิดพลาด: ไม่พบข้อมูลนัดหมายนี้"
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Admin: update status handler
  const handleAdminUpdateStatus = async () => {
    if (!isAdmin) return;
    if (!adminStatus) return;
    if (adminStatus === appointment?.status) {
      alert('สถานะไม่เปลี่ยนแปลง');
      return;
    }

    // Confirm for destructive statuses
    const destructive = ['cancelled', 'rejected'];
    if (destructive.includes(adminStatus)) {
      const ok = window.confirm('คุณแน่ใจที่จะเปลี่ยนสถานะเป็น ' + adminStatus + '? การกระทำนี้อาจมีผลกับข้อมูลผู้ใช้');
      if (!ok) return;
    }

    // Optional reason for cancelled/rejected
    let payload = { status: adminStatus };
    if (adminStatus === 'cancelled' || adminStatus === 'rejected') {
      const reason = window.prompt('ระบุเหตุผล (ไม่บังคับ):', appointment?.reason || '');
      if (reason !== null && String(reason).trim() !== '') payload.reason = reason.trim();
    }

    try {
      setUpdatingStatus(true);
      setActionMessage('กำลังอัปเดตสถานะ...');
      setActionLoading(true);
      await appointmentService.updateStatus(id, payload);
      const updated = await appointmentService.get(id);
      setAppointment(updated);
      setAdminStatus(updated?.status || '');
      alert('อัปเดตสถานะเรียบร้อย');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setUpdatingStatus(false);
      setActionLoading(false);
      setActionMessage('');
    }
  };

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
      case 'completed':
        return <IoCheckmarkCircleOutline className="text-sky-500 text-xl" />;
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
      case 'completed':
        return 'from-sky-500 to-indigo-500';
      case 'cancelled':
        return 'from-gray-400 to-gray-500';
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
      case 'reschedule_requested':
        return 'ขอเลื่อนนัด';
      default:
        return status || 'ไม่ระบุ';
    }
  };

  // กำหนดรายชื่อผู้เข้าร่วม
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

  // Compute reschedule response helper for display (student's reply to a reschedule request)
  const rescheduleResponse = appointment?.reschedule?.response;
  const rescheduleResponder = rescheduleResponse
    ? (attendees.find(u => String(u._id) === String(rescheduleResponse.responder)) || appointment?.createBy || appointment?.project?.advisor)
    : null;
  const rescheduleResponderName = rescheduleResponder ? (rescheduleResponder.fullName || rescheduleResponder.username || rescheduleResponder.email) : (rescheduleResponse ? String(rescheduleResponse.responder) : null);

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
      <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-full">
        <div className="min-h-screen flex items-center center justify-center ">
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

  // ฮาดดีลิสสส
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

  const handleApprove = async () => {
    setActionMessage('กำลังยืนยันนัดหมาย...');
    setActionLoading(true);
    try {
      await appointmentService.updateStatus(id, { status: 'approved' });
      const updated = await appointmentService.get(id);
      setAppointment(updated);
      alert('ยืนยันนัดหมายเรียบร้อย');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'ไม่สามารถยืนยันนัดหมายได้');
    } finally {
      setActionLoading(false);
      setActionMessage('');
    }
  };

  const handleApproveReschedule = async () => {
    setActionMessage('กำลังอนุมัติการเลื่อนนัด...');
    setActionLoading(true);
    try {
      await appointmentService.respondToReschedule(id, { accepted: true });
      const updated = await appointmentService.get(id);
      setAppointment(updated);
      alert('อนุมัติการเลื่อนนัดเรียบร้อยแล้ว');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'ไม่สามารถอนุมัติการเลื่อนนัดได้');
    } finally {
      setActionLoading(false);
      setActionMessage('');
    }
  };

  const handleCancelWithReason = async ({ reason }) => {
    setCancelSubmitting(true);
    try {
      const res = await appointmentService.updateStatus(id, { status: 'cancelled', reason });
      // If backend returned deleted indicator, navigate away
      if (res && res.deleted) {
        setShowCancelModal(false);
        navigate('/appointments', { replace: true });
        return;
      }
      const updated = await appointmentService.get(id);
      setAppointment(updated);
      setShowCancelModal(false);
    } catch (e) {
      throw e;
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen">
      <LoadingOverlay show={actionLoading} message={actionMessage} />
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {!editMode ? (
          // View Mode
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
              {/* Status Bar */}
              <div className={`h-2 bg-gradient-to-r ${getStatusColor(appointment.status)}`}></div>

              <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                      {appointment.title}
                    </h2>
                    {/* Admin-only CreatedAt field */}
                    {isAdmin && appointment.createdAt && (
                      <div className="text-xs text-gray-500 mb-2">
                        สร้างเมื่อ: {new Date(appointment.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                    <div className="flex items-center mb-4">
                      {getStatusIcon(appointment.status)}
                      <span className="ml-2 font-medium text-gray-700">
                        {getStatusText(appointment.status)}
                        {/* Show the student's rejection reason (if any) when the appointment has a reschedule response that was not accepted. */}
                        {appointment?.reschedule?.response && appointment.reschedule.response.accepted === false && appointment.reschedule.response.reason ? (
                          <span className="ml-2 text-sm text-red-600 font-medium">({appointment.reschedule.response.reason})</span>
                        ) : null}
                      </span>
                      {appointment.status === 'reschedule_requested' && (
                        <span className="ml-2 text-sm text-orange-600 font-semibold">(รอการตอบรับจากนักศึกษา)</span>
                      )}
                      {(appointment.status === 'rejected' || appointment.status === 'cancelled') && appointment.reason && (
                        <span className="ml-2 text-sm text-red-600 font-semibold">({appointment.reason})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-3 md:mt-0">
                    {/* Admin status management */}
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <select
                          value={adminStatus}
                          onChange={(e) => setAdminStatus(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">-- เปลี่ยนสถานะ --</option>
                          {/* Allow admin to set any status (including pending/reschedule_requested/expired) */}
                          <option value="pending">รอดำเนินการ</option>
                          <option value="approved">อนุมัติแล้ว</option>
                          <option value="reschedule_requested">ขอเลื่อนนัด</option>
                          <option value="rejected">ปฏิเสธ</option>
                          <option value="cancelled">ยกเลิก</option>
                          <option value="completed">เสร็จสิ้น</option>
                          <option value="expired">หมดอายุ</option>
                        </select>
                        <button
                          onClick={handleAdminUpdateStatus}
                          disabled={updatingStatus}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-500 disabled:opacity-60"
                        >
                          {updatingStatus ? 'กำลังบันทึก...' : 'อัปเดตสถานะ'}
                        </button>
                      </div>
                    )}
                    {appointment?.isNextAppointment && (
                      <button onClick={async () => {
                        try {
                          // fetch previous appointment and meeting summary if available
                          const prev = appointment.previousAppointment ? await appointmentService.get(appointment.previousAppointment) : null;
                          let summary = null;
                          if (appointment.meetingSummary) {
                            const s = await (await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/meetingsummaries/${appointment.meetingSummary}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })).json();
                            summary = s;
                          }
                          setNextInfo({ previous: prev, summary });
                          setShowNextInfoModal(true);
                        } catch (err) { console.error(err); alert('โหลดข้อมูลล้มเหลว'); }
                      }} className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm flex-shrink-0">นัดหมายครั้งถัดไป</button>
                    )}
                    {/* Student actions for reschedule request */}
                    {appointment.status === 'reschedule_requested' && (isProjectMember || isCreator) && (
                      <>
                        <button
                          onClick={handleApproveReschedule}
                          className="group flex items-center px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                          title="อนุมัติการเลื่อนนัด"
                        >
                          <span className="font-medium">อนุมัติเวลาใหม่</span>
                        </button>
                        <button
                          onClick={() => setShowRejectRescheduleModal(true)}
                          className="group flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                          title="ปฏิเสธการเลื่อนนัด"
                        >
                          <span className="font-medium">ปฏิเสธเวลาใหม่</span>
                        </button>
                      </>
                    )}

                    {/* Cancel & Edit: visible to creator (who is not an advisor) or admin */}
                    {(isAdmin || (isCreator && !isAdvisor)) && appointment?.status !== 'completed' && !isLocked && !showOnlyComplete && appointment.status !== 'reschedule_requested' && appointment.status !== 'approved' && (
                      <>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex-shrink-0"
                          title="ขอยกเลิกนัดหมาย"
                        >
                          <AiFillCloseCircle className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                          <span>ขอยกเลิกนัดหมาย</span>
                        </button>

                        {/* Admin permanent delete (visible only to admins) */}
                        {isAdmin && (
                          <button
                            onClick={async () => {
                              try {
                                const ok = window.confirm('ยืนยัน: ลบนัดหมายนี้ถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้.');
                                if (!ok) return;
                                await appointmentService.delete(id);
                                navigate('/appointments', { replace: true });
                              } catch (e) {
                                setError(e?.response?.data?.message || e?.message || 'ลบไม่สำเร็จ');
                              }
                            }}
                            className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex-shrink-0"
                            title="ลบนัดหมายนี้"
                          >
                            <AiFillCloseCircle className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                            <span>ลบนัดหมายนี้</span>
                          </button>
                        )}

                        <button
                          onClick={() => { if (appointment?.status === 'completed' && !isAdmin) return; setEditMode(true); }}
                          className="group flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex-shrink-0"
                        >
                          <AiFillEdit className="text-xl mr-2 group-hover:rotate-12 transition-transform duration-300" />
                          <span>แก้ไขนัดหมาย</span>
                        </button>
                      </>
                    )}

                    {/* Advisor actions */}
                    {advisorCanApprove && appointment?.status !== 'completed' && !isLocked && !showOnlyComplete && appointment.status !== 'reschedule_requested' && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={handleApprove}
                            className="group flex items-center px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl mr-2 shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                            title="ยืนยันนัดหมาย"
                          >
                            <span className="font-medium">ยืนยันนัดหมาย</span>
                          </button>
                        </div>
                        </>
                    )}

                    {/* Allow advisor to reschedule/reject even after approving (but not if completed/locked/reschedule_requested) */}
                    {isAdvisor && appointment?.status !== 'completed' && !isLocked && appointment.status !== 'reschedule_requested' && (
                      <>
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          className="group flex items-center px-4 py-2 bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 text-white rounded-xl mr-2 shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                          title="ขอเปลี่ยนแปลงเวลา"
                        >
                          <span className="font-medium">ขอเปลี่ยนแปลงเวลา</span>
                        </button>

                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="group flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                          title={appointment?.status === 'approved' ? 'ยกเลิก' : 'ปฏิเสธ'}
                        >
                          <span className="font-medium">{appointment?.status === 'approved' ? 'ยกเลิก' : 'ปฏิเสธ'}</span>
                        </button>
                      </>
                    )}

                    {/* Participant actions on follow-ups: participants (students) can approve pending follow-ups */}
                    {participantCanApproveFollowUp && appointment?.status === 'pending' && !isLocked && (
                      <>
                        <button
                          onClick={handleApprove}
                          className="group flex items-center px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl mr-2 shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0"
                          title="ยืนยันนัดหมาย"
                        >
                          <span className="font-medium">ยืนยันนัดหมาย</span>
                        </button>
                      </>
                    )}

                    {/* Complete meeting: visible only to advisor or admin */}
                    {showOnlyComplete && appointment?.status !== 'completed' && !isLocked && (
                      <button
                        onClick={() => setShowSummaryModal(true)}
                        className="group flex items-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <AiFillSave className="text-xl mr-2 group-hover:scale-110 transition-transform duration-300" />
                        <span>เสร็จสิ้นการประชุม</span>
                      </button>
                    )}
                  </div>
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
                    <span className={`font-medium ${appointment.status === 'reschedule_requested' ? 'line-through' : ''}`}>{appointment.date}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <AiFillClockCircle className="text-green-500 mr-3" />
                    <span className={appointment.status === 'reschedule_requested' ? 'line-through' : ''}>{appointment.startTime} - {appointment.endTime}</span>
                  </div>
                  {appointment.status === 'reschedule_requested' && appointment.reschedule && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                       <h4 className="text-md font-bold text-orange-600 mb-2">เวลาที่เสนอใหม่:</h4>
                       <div className="flex items-center text-gray-700">
                         <AiFillCalendar className="text-purple-500 mr-3" />
                         <span className="font-medium">{appointment.reschedule.date}</span>
                       </div>
                       <div className="flex items-center text-gray-700 mt-2">
                         <AiFillClockCircle className="text-green-500 mr-3" />
                         <span>{appointment.reschedule.startTime} - {appointment.reschedule.endTime}</span>
                       </div>
                       {appointment.reschedule.reason && (
                        <p className="text-sm text-gray-600 mt-2"><strong>เหตุผล:</strong> {appointment.reschedule.reason}</p>
                       )}
                      {rescheduleResponse && (
                        <div className="mt-2 bg-gray-50 p-3 rounded-md border border-gray-100">
                          <p className="text-sm text-gray-700"><strong>การตอบกลับจากนักศึกษา:</strong> {rescheduleResponse.accepted ? 'ยอมรับเวลาใหม่' : 'ปฏิเสธเวลาใหม่'}</p>
                          {rescheduleResponse.reason && <p className="text-sm text-gray-600 mt-1"><strong>เหตุผลจากนักศึกษา:</strong> {rescheduleResponse.reason}</p>}
                          <p className="text-xs text-gray-500 mt-1">โดย: {rescheduleResponderName}{rescheduleResponse.respondedAt ? ` • เมื่อ ${new Date(rescheduleResponse.respondedAt).toLocaleString('th-TH')}` : ''}</p>
                        </div>
                      )}
                    </div>
                  )}
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
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 font-medium">{appointment.project.name || "-"}</p>
                  <div>
                    <button onClick={() => navigate(`/projects/details/${appointment.project._id}`)} className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm">ดูโปรเจค</button>
                  </div>
                </div>
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
                      <li key={a._id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{a.originalName}</div>
                          <div className="text-xs text-gray-500">
                            {a.mimeType || 'ไฟล์'}{sizeKB ? ` • ${sizeKB} KB` : ''}{created ? ` • อัปโหลด ${created.toLocaleString('th-TH')}` : ''}{expire ? ` • หมดอายุ ${expire.toLocaleString('th-TH')}` : ''}
                          </div>
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2">
                          <button onClick={onDownload} className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 w-full sm:w-auto text-center">
                            ดาวน์โหลด
                          </button>
                          {/* future: add remove button if allowed */}
                        </div>
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
                    <TimePicker id="edit-start" name="startTime" value={form.startTime} onChange={(v) => setForm(prev => ({ ...prev, startTime: v }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เวลาสิ้นสุด *
                    </label>
                    <TimePicker id="edit-end" name="endTime" value={form.endTime} onChange={(v) => setForm(prev => ({ ...prev, endTime: v }))} />
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
                    disabled={saving || isLocked || showOnlyComplete || (appointment?.status === 'completed' && !isAdmin) || (appointment?.status === 'approved' && !isAdmin)}
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

                  {user?.role === 'admin' && (
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

      {/* Modals for advisor actions */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        appointment={appointment}
        onClose={() => setShowRescheduleModal(false)}
        onSubmit={async ({ date, startTime, endTime, reason }) => {
          try {
            await appointmentService.requestReschedule(id, { date, startTime, endTime, reason });
            const updated = await appointmentService.get(id);
            setAppointment(updated);
            setShowRescheduleModal(false);
            alert('ส่งคำขอเลื่อนนัดเรียบร้อยแล้ว');
          } catch (e) {
            throw e;
          }
        }}
      />

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSubmit={async ({ reason, note }) => {
          try {
            await appointmentService.updateStatus(id, { status: 'rejected', reason, note });
            const updated = await appointmentService.get(id);
            setAppointment(updated);
            setShowRejectModal(false);
            alert('ปฏิเสธนัดหมายเรียบร้อยแล้ว');
          } catch (e) {
            throw e;
          }
        }}
      />

      <SummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        onSubmit={async ({ summary, homework, nextMeetingDate, createNext, nextStartTime, nextEndTime, nextTitle, files }) => {
          try {
            // First, mark this appointment as completed and create the MeetingSummary on the server.
            // This ensures we don't create follow-up appointments or send follow-up emails when the
            // MeetingSummary creation fails (for example, duplicate summary -> 409).
            const payload = { status: 'completed', summary, homework };
            if (nextMeetingDate) payload.nextMeetingDate = nextMeetingDate;

            const res = await appointmentService.updateStatus(id, payload);

            const updated = await appointmentService.get(id);

            // If the user requested a follow-up appointment, create it now. Creating it after the summary
            if (createNext) {
              // validate date and times
              if (!nextMeetingDate || !nextStartTime || !nextEndTime) {
                throw new Error('กรุณาระบุวันที่และเวลาสำหรับการสร้างนัดหมายครั้งถัดไป');
              }
              // Ensure date is yyyy-mm-dd
              const isoDate = String(nextMeetingDate).includes('T') ? String(nextMeetingDate).split('T')[0] : String(nextMeetingDate);
              const createPayload = {
                title: nextTitle || `นัดหมาย follow-up: ${appointment.title}`,
                description: `Follow-up from meeting ${appointment.title}`,
                date: isoDate,
                startTime: nextStartTime,
                endTime: nextEndTime,
                meetingType: appointment.meetingType || 'online',
                location: appointment.location || '',
                note: '',
                project: appointment.project?._id || appointment.project,
              };
              try {
                await appointmentService.create(createPayload);
              } catch (createErr) {
                console.error('Create follow-up appointment failed', createErr);
                // Do not revert the saved summary, but surface the error to the user.
                alert('สรุปถูกบันทึก แต่การสร้างนัดหมายครั้งถัดไปล้มเหลว');
              }
            }

            // If there are files to upload, and the backend added meetingSummary id to appointment
            const meetingSummaryIdRaw = updated?.meetingSummary?._id || updated?.meetingSummary || null;
            const meetingSummaryId = meetingSummaryIdRaw ? String(meetingSummaryIdRaw) : null;
            if (Array.isArray(files) && files.length > 0 && meetingSummaryId) {
              try {
                await attachmentService.upload('meetingSummary', meetingSummaryId, files);
              } catch (upErr) {
                // log detailed server response when available
                console.error('Upload meeting summary attachments failed', upErr);
                const serverDetail = upErr?.response?.data?.detail || upErr?.response?.data?.message || upErr?.message;
                // not fatal for the summary save; inform user with more detail
                alert(`สรุปถูกบันทึก แต่การอัปโหลดไฟล์ล้มเหลว\n\n${serverDetail}`);
              }
            }

            setAppointment(updated);
            setShowSummaryModal(false);
            alert('บันทึกสถานะว่าเสร็จสิ้นเรียบร้อยแล้ว');
          } catch (e) {
            // The modal will handle showing the error (e.g., 409 duplicate summary). Re-throw so the modal can display it.
            throw e;
          }
        }}
      />

      <RejectRescheduleModal
        isOpen={showRejectRescheduleModal}
        onClose={() => setShowRejectRescheduleModal(false)}
        onSubmit={async ({ reason }) => {
          try {
            await appointmentService.respondToReschedule(id, { accepted: false, reason });
            const updated = await appointmentService.get(id);
            setAppointment(updated);
            setShowRejectRescheduleModal(false);
            alert('ปฏิเสธการเลื่อนนัดเรียบร้อยแล้ว');
          } catch (e) {
            // The modal will handle showing the error
            throw e;
          }
        }}
      />

  <CancelReasonModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} submitting={cancelSubmitting} onSubmit={handleCancelWithReason} />

  <NextAppointmentInfoModal isOpen={showNextInfoModal} onClose={() => setShowNextInfoModal(false)} previousAppointment={nextInfo.previous} meetingSummary={nextInfo.summary} />
    </div>
  );
}
