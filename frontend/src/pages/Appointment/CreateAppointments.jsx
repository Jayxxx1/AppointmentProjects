import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import ConfirmAppointmentModal from "../../components/ConfirmAppointmentModal.jsx";
import FeedbackModal from "../../components/Modal/FeedbackModal.jsx";
import { projectService } from "../../services/projectService.js";
import { appointmentService } from "../../services/appointmentService.js"; // ✅ แก้ path ให้ถูก

import { Calendar, Clock, MapPin, FileText, User, AlertCircle, CheckCircle, Users } from "lucide-react";

export default function CreateAppointment() {
  // ดึง user เพื่อส่งให้ Modal แสดง StudentID - Fullname
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [attachEnabled, setAttachEnabled] = useState(false);

  const [formData, setFormData] = useState({
    project: "",
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    meetingType: "offline",
    location: "",
    note: "",
  });
  const [files, setFiles] = useState([]);

  const [projects, setProjects] = useState([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Step management for wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({});

  const steps = [
    { id: 1, title: "โปรเจกต์", icon: FileText },
    { id: 2, title: "รายละเอียด", icon: FileText },
    { id: 3, title: "เวลาและสถานที่", icon: Calendar },
    { id: 4, title: "สรุป", icon: CheckCircle }
  ];

  // ✅ helper: วันที่วันนี้แบบ local (ไม่โดน UTC ลบวัน)
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await projectService.listMine();
        if (!alive) return;
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setProjects([]);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    const proj = projects.find((p) => p._id === formData.project) || null;
    setSelectedProjectTitle(proj?.name || "");
    setMembers(proj?.members || []);
    setSelectedAdvisor(
      proj?.advisor
        ? {
            name: proj.advisor.fullName || proj.advisor.username || proj.advisor.email,
            email: proj.advisor.email,
            _id: proj.advisor._id,
          }
        : null
    );
  }, [formData.project, projects]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (stepErrors[name]) {
      setStepErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const validateForm = () => {
    if (!formData.project) return "กรุณาเลือกโปรเจคของคุณ";
    if (!formData.title) return "กรุณากรอกหัวข้อการนัดหมาย";
    if (!formData.date) return "กรุณากรอกวันที่นัดหมาย";
    if (!formData.startTime || !formData.endTime) return "กรุณากรอกเวลานัดหมาย";

    const start = new Date(`${formData.date}T${formData.startTime}:00`);
    const end = new Date(`${formData.date}T${formData.endTime}:00`);
    const now = new Date();
    if (end <= start) return "เวลาสิ้นสุดต้องหลังเวลาเริ่ม";
    if (start <= now) return "ไม่สามารถเลือกเวลาอดีตได้";

    if (formData.meetingType === "offline" && !String(formData.location || "").trim()) {
      return "กรุณากรอกสถานที่จัดประชุม";
    }
    return "";
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.project) newErrors.project = "กรุณาเลือกโปรเจกต์";
    }

    if (step === 2) {
      if (!formData.title.trim()) newErrors.title = "กรุณากรอกหัวข้อการนัดหมาย";
    }

    if (step === 3) {
      if (!formData.date) newErrors.date = "กรุณาเลือกวันที่";
      if (!formData.startTime) newErrors.startTime = "กรุณาเลือกเวลาเริ่มต้น";
      if (!formData.endTime) newErrors.endTime = "กรุณาเลือกเวลาสิ้นสุด";

      if (formData.startTime && formData.endTime) {
        const start = new Date(`${formData.date}T${formData.startTime}`);
        const end = new Date(`${formData.date}T${formData.endTime}`);
        if (end <= start) newErrors.endTime = "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น";
      }

      if (formData.meetingType === "offline" && !formData.location.trim()) {
        newErrors.location = "กรุณากรอกสถานที่";
      }
    }

    setStepErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showPopupError = (message) => {
    setError(message);
    setFeedbackMsg(message);
    setShowFeedback(true);
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setError("");
    const validationMessage = validateForm();
    if (validationMessage) {
      showPopupError(validationMessage);
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: formData.title?.trim(),
        description: formData.description?.trim() || "",
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        meetingType: formData.meetingType || "online",
        location: (formData.location || "").trim(),
        reason: "",
        meetingNotes: (formData.note || "").trim(),
        project: formData.project || null,
      };

      // ส่งเมลไปที่อาจารย์อัตโนมัติ (ถ้ามี)
      if (selectedAdvisor?.email) {
        payload.participantEmails = [selectedAdvisor.email];
      }

      await appointmentService.create(payload, files); 

      setShowPreview(false);
      setFeedbackMsg("สร้างนัดหมายสำเร็จ");
      setShowFeedback(true);
      setTimeout(() => { navigate("/appointments"); }, 800);
    } catch (err) {
      const msg = err?.response?.data?.message || "สร้างนัดหมายไม่สำเร็จ";
      showPopupError(msg);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const selectedProject = projects.find((p) => p._id === formData.project) || null;

  const renderStepIndicator = () => (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-center space-x-1 md:space-x-4 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                <div className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-200
                  ${isActive ? 'bg-blue-500 text-white shadow-lg scale-110' :
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <span className={`
                  mt-1 text-xs md:text-sm font-medium text-center whitespace-nowrap
                  ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                `}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-8 md:w-12 h-0.5 mx-2 transition-colors duration-200
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">เลือกโปรเจกต์ของคุณ</h3>
        <p className="text-gray-600">เลือกโปรเจกต์ที่คุณต้องการสร้างนัดหมาย</p>
      </div>

      <div className="grid gap-4">
        {projects.map(project => (
          <div
            key={project._id}
            onClick={() => handleChange({ target: { name: 'project', value: project._id } })}
            className={`
              p-4 md:p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md
              ${formData.project === project._id
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <div className="flex items-start space-x-4">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                ${formData.project === project._id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 mb-1">{project.name}</h4>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <User className="w-4 h-4 mr-1" />
                  <span>{project.advisor?.fullName || project.advisor?.username || project.advisor?.email}</span>
                </div>
                <p className="text-sm text-gray-500">{project.advisor?.email}</p>
              </div>
              {formData.project === project._id && (
                <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {stepErrors.project && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{stepErrors.project}</span>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">รายละเอียดการนัดหมาย</h3>
        <p className="text-gray-600">กรอกข้อมูลเกี่ยวกับการนัดหมายของคุณ</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2 text-base font-semibold text-gray-700 mb-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span>หัวข้อการนัดหมาย *</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="เช่น ประชุมเพื่อนำเสนอความคืบหน้าโครงงาน"
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors duration-200
              ${stepErrors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            `}
          />
          {stepErrors.title && (
            <div className="flex items-center space-x-2 text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{stepErrors.title}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">รายละเอียดเพิ่มเติม</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="อธิบายรายละเอียดเพิ่มเติมเกี่ยวกับการนัดหมาย..."
            rows="4"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors duration-200 resize-none"
          />
        </div>

        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">บันทึกเพิ่มเติม</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="ข้อความถึงอาจารย์ที่ปรึกษา..."
            rows="3"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 transition-colors duration-200 resize-none"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">เวลาและสถานที่</h3>
        <p className="text-gray-600">กำหนดเวลาและเลือกรูปแบบการประชุม</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="flex items-center space-x-2 text-base font-semibold text-gray-700 mb-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span>วันที่ *</span>
          </label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={todayStr} 
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors duration-200
              ${stepErrors.date ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            `}
          />
          {stepErrors.date && (
            <div className="flex items-center space-x-2 text-red-600 mt-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{stepErrors.date}</span>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-base font-semibold text-gray-700 mb-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span>เวลาเริ่มต้น *</span>
          </label>
          <input
            type="time"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors duration-200
              ${stepErrors.startTime ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            `}
          />
          {stepErrors.startTime && (
            <div className="flex items-center space-x-2 text-red-600 mt-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{stepErrors.startTime}</span>
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2 text-base font-semibold text-gray-700 mb-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span>เวลาสิ้นสุด *</span>
          </label>
          <input
            type="time"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors duration-200
              ${stepErrors.endTime ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            `}
          />
          {stepErrors.endTime && (
            <div className="flex items-center space-x-2 text-red-600 mt-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{stepErrors.endTime}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-base font-semibold text-gray-700">รูปแบบการประชุม *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleChange({ target: { name: 'meetingType', value: 'offline' } })}
            className={`
              p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md
              ${formData.meetingType === 'offline'
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center space-x-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${formData.meetingType === 'offline' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">ออฟไลน์</h4>
                <p className="text-sm text-gray-600">ประชุมในห้อง</p>
              </div>
              {formData.meetingType === 'offline' && (
                <CheckCircle className="w-6 h-6 text-blue-500 ml-auto" />
              )}
            </div>
          </div>

          <div
            onClick={() => handleChange({ target: { name: 'meetingType', value: 'online' } })}
            className={`
              p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md
              ${formData.meetingType === 'online'
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center space-x-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${formData.meetingType === 'online' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
              `}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">ออนไลน์</h4>
                <p className="text-sm text-gray-600">Teams, Meet, Zoom</p>
              </div>
              {formData.meetingType === 'online' && (
                <CheckCircle className="w-6 h-6 text-blue-500 ml-auto" />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-2 text-base font-semibold text-gray-700 mb-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            <span>
              {formData.meetingType === 'offline' ? 'สถานที่ *' : 'ลิงก์การประชุม'}
            </span>
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder={formData.meetingType === 'offline'
              ? "เช่น อาคารเรียนรวม 1 ห้อง 201"
              : "เช่น https://teams.microsoft.com/meeting/..."}
            className={`
              w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors duration-200
              ${stepErrors.location ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            `}
          />
          {stepErrors.location && (
            <div className="flex items-center space-x-2 text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{stepErrors.location}</span>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center space-x-3 mb-3">
            <input
              type="checkbox"
              id="attachFiles"
              checked={attachEnabled}
              onChange={(e) => setAttachEnabled(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="attachFiles" className="text-base font-semibold text-gray-700">
              แนบไฟล์เอกสาร
            </label>
          </div>

          {attachEnabled && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              {files.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  เลือกไฟล์แล้ว: {files.length} ไฟล์
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">ตรวจสอบข้อมูล</h3>
        <p className="text-gray-600">กรุณาตรวจสอบข้อมูลก่อนยืนยันการสร้างนัดหมาย</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-800">โปรเจกต์</h4>
            <p className="text-gray-600">{selectedProjectTitle}</p>
            <p className="text-sm text-gray-500">อาจารย์ที่ปรึกษา: {selectedAdvisor?.name}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-800">หัวข้อ</h4>
            <p className="text-gray-600">{formData.title}</p>
            {formData.description && (
              <p className="text-sm text-gray-500 mt-1">{formData.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Calendar className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-800">วันที่และเวลา</h4>
            <p className="text-gray-600">
              {formData.date && new Date(formData.date).toLocaleDateString('th-TH', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
            <p className="text-sm text-gray-500">
              {formData.startTime} - {formData.endTime}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-gray-800">
              {formData.meetingType === 'offline' ? 'สถานที่' : 'ลิงก์การประชุม'}
            </h4>
            <p className="text-gray-600">{formData.location}</p>
            <p className="text-sm text-gray-500">
              รูปแบบ: {formData.meetingType === 'offline' ? 'ออฟไลน์' : 'ออนไลน์'}
            </p>
          </div>
        </div>

        {formData.note && (
          <div className="flex items-start space-x-3">
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">บันทึกเพิ่มเติม</h4>
              <p className="text-gray-600">{formData.note}</p>
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex items-start space-x-3">
            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-gray-800">ไฟล์แนบ</h4>
              <p className="text-gray-600">{files.length} ไฟล์</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  const handleSubmit = async () => {
    setCurrentStep(4);
    setTimeout(() => {
      handlePreview({ preventDefault: () => {} });
    }, 100);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div
        aria-hidden="true"
        className="
          absolute inset-0 z-0 pointer-events-none
          bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed
          blur-sm
        "
      />

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">สร้างนัดหมายใหม่</h1>
            <p className="text-gray-600">จัดการนัดหมายกับอาจารย์ที่ปรึกษาได้อย่างง่ายดาย</p>
          </div>

          {renderStepIndicator()}

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">{renderStepContent()}</div>

            <div className="bg-gray-50 px-6 md:px-8 py-4 flex justify-between items-center">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all duration-200 ${
                  currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
                }`}
              >
                ← ก่อนหน้า
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  className="px-4 md:px-6 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 active:scale-95"
                >
                  ถัดไป →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`px-6 md:px-8 py-3 font-bold rounded-xl transition-all duration-200 flex items-center space-x-2 text-white ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:scale-95'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังสร้าง...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>ยืนยันสร้างนัดหมาย</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <ConfirmAppointmentModal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={handleConfirmSubmit}
          formData={formData}
          files={files}
          projectInfo={selectedProject}
          members={members}
          advisor={selectedAdvisor}
          student={(user?.user || user) ?? null}
          loading={loading}
          projectTitle={selectedProjectTitle}
        />
        <FeedbackModal
          open={showFeedback}
          message={feedbackMsg}
          onClose={() => setShowFeedback(false)}
          autoClose={0}
        />
      </div>
    </div>
  );
}
