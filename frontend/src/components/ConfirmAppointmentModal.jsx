import React from "react";
import ReactDOM from 'react-dom';

const ModalPortal = ({ children }) => {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;
  return ReactDOM.createPortal(children, modalRoot);
};

export default function ConfirmAppointmentModal({
  open,
  onClose,
  onConfirm,
  formData,
  files,
  projectInfo,
  members,
  advisor,
  student,
  loading,
  projectTitle,
}) {
  if (!open) return null;

  // แสดงชื่ออาจารย์ (ไม่ต้องมี AdvisorID)
  const advisorDisplay =
    advisor ? (advisor.fullName || advisor.name || advisor.username || advisor.email) : "-";

  // นักศึกษา: "StudentID - Fullname"
  const s = student && (student.user || student);
  const studentDisplay = s
    ? `${s.studentId ? `${s.studentId} - ` : ""}${s.fullName || s.username || s.email || "-"}`
    : "-";
  const id = student && (student.user || student);
  const studentID = s
    ? (s.studentId ? `${s.studentId}` : "ไม่พบข้อมูลรหัสนักศึกษา")
    : "-";

  const renderDetails = (label, value) => (
    <div className="flex justify-between items-center py-2 border-b last:border-b-0 border-gray-200">
      <span className="font-medium text-gray-600 whitespace-nowrap text-base md:text-lg">{label}</span>
      <span className="text-gray-800 font-semibold text-right break-words">{value || "-"}</span>
    </div>
  );

  return (
    <ModalPortal>
      {/* Overlay that covers all elements with a high z-index */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-2 sm:p-6">
        {/* Transparent backdrop that blurs the background */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

        <div
          className="relative bg-white rounded-2xl shadow-lg max-w-4xl w-full px-2 py-4 sm:px-16 sm:py-8 z-10 animate-fade-in-up overflow-y-auto"
          style={{ maxHeight: '90vh' }}
        >
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">ยืนยันการส่งคำขอ</h2>
          <p className="text-center text-gray-500 mb-6">กรุณาตรวจสอบรายละเอียดทั้งหมดให้ถูกต้องก่อนยืนยันการส่ง</p>

          {/* Advisor & Project Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <div className="flex flex-col">
              <label className="font-semibold text-gray-700 mb-1 text-base md:text-lg">อาจารย์ที่ปรึกษา</label>
              <div className="bg-gray-100 p-3 rounded-lg text-base md:text-lg font-medium text-gray-800 border border-gray-200">
                {advisorDisplay}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="font-semibold text-gray-700 mb-1 text-base md:text-lg">โปรเจค</label>
              <div className="bg-gray-100 p-3 rounded-lg text-base md:text-lg font-medium text-gray-800 border border-gray-200">
                {projectInfo?.name || "-"}
              </div>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">รายละเอียดการนัดหมาย</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              {renderDetails("ผู้จอง (นักศึกษา)", studentDisplay)}
              {renderDetails("ชื่อโปรเจกต์", projectTitle)}
              {renderDetails("หัวข้อการนัดหมาย", formData.title)}
              {renderDetails("วันที่", formData.date)}
              {renderDetails("เวลา", `${formData.startTime || "-"} - ${formData.endTime || "-"}`)}
              <div className="flex justify-between items-center py-2 col-span-1 md:col-span-2">
                <span className="font-medium text-gray-600">ช่องทางการประชุม</span>
                <div className="text-right">
                  {formData.meetingType === "online" ? (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full text-sm mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 4v-4H4a2 2 0 01-2-2V5z" />
                          <path d="M15 7v2a4 4 0 01-4 4H9.83l-1.57 1.57A.75.75 0 017 14.5v-3.465a.25.25 0 01.3-.245c1.472.298 2.87 1.135 4.093 2.502a8.006 8.006 0 004.814-5.32c-.147-.282-.574-.523-.746-.732z" />
                        </svg>
                        Online
                      </span>
                      <span className="text-gray-800 font-semibold text-sm">
                        {formData.location || "-"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-800 font-semibold">{formData.location || "-"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Members List Section */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">สมาชิกในโปรเจค</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(members || []).length > 0 ? (
                (members || []).map((mem) => (
                  <div
                    key={mem._id}
                    className="bg-gray-50 p-3 rounded-lg flex items-center gap-2 border border-gray-200"
                  >
                    <span className="text-gray-500 font-mono text-sm">
                      {mem.studentId ? mem.studentId : "ไม่พบข้อมูลรหัสนักศึกษา"}
                    </span>
                    <span className="font-medium text-gray-800">
                      {mem.fullName || mem.username || mem.email}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-gray-400 italic col-span-2">ไม่มีข้อมูลสมาชิก</span>
              )}
            </div>
          </div>

          {/* Files & Note Section */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">ไฟล์แนบและหมายเหตุ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-gray-700">ไฟล์แนบ</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {files.length > 0 ? files.map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      {file.name}
                    </span>
                  )) : <span className="text-gray-400 italic">-</span>}
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700">หมายเหตุ</label>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-1 min-h-[48px] whitespace-pre-wrap">
                  <p className="text-gray-800">{formData.note || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8">
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
              onClick={onClose}
            >
              ย้อนกลับ
            </button>
            <button
              type="button"
              className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-not-allowed"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "กำลังส่ง..." : "ยืนยัน"}
            </button>
          </div>

          <div className="text-xs text-red-500 text-center mt-4">
            หลังจาก “ยืนยัน” ระบบจะส่งคำขอไปยังอาจารย์ที่ปรึกษาประจำโปรเจคของคุณ
          </div>
        </div>

        <style>{`
          .animate-fade-in-up {
            animation: fade-in-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </ModalPortal>
  );
}
