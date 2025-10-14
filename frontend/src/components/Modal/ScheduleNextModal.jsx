import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { AiOutlineClose } from 'react-icons/ai';
import { appointmentService } from '../../services/appointmentService';

const ScheduleNextModal = ({ isOpen, onClose, onCreated, defaultProjectId, defaultDate, previousAppointmentId, meetingSummaryId }) => {
  const [form, setForm] = useState({ project: defaultProjectId || '', title: '', description: '', date: defaultDate || '', startTime: '', endTime: '', meetingType: 'online', location: '', note: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ project: defaultProjectId || '', title: '', description: '', date: defaultDate || '', startTime: '', endTime: '', meetingType: 'online', location: '', note: '' });
      setError('');
      setLoading(false);
    }
  }, [isOpen, defaultProjectId, defaultDate]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.project) return 'กรุณาเลือกโปรเจกต์';
    if (!form.title) return 'กรุณากรอกหัวข้อ';
    if (!form.date) return 'กรุณาเลือกวันที่';
    if (!form.startTime || !form.endTime) return 'กรุณาเลือกเวลาเริ่มและสิ้นสุด';
    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);
    if (end <= start) return 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';
    const now = new Date();
    if (start <= now) return 'ไม่สามารถเลือกเวลาอดีตได้';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) { setError(v); return; }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        meetingType: form.meetingType,
        location: form.location,
        note: form.note,
        project: form.project,
        isNextAppointment: true,
      };
  if (previousAppointmentId) payload.previousAppointment = previousAppointmentId;
  if (meetingSummaryId) payload.meetingSummary = meetingSummaryId;
  const created = await appointmentService.create(payload);
      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'สร้างนัดหมายไม่สำเร็จ');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 md:p-8 m-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><AiOutlineClose size={24} /></button>
          <h2 className="text-2xl font-bold mb-4">สร้างนัดหมายครั้งถัดไป</h2>
          {error && <div className="text-red-600 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">หัวข้อ *</label>
              <input name="title" value={form.title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">วันที่ *</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">เวลาเริ่ม *</label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">เวลาสิ้นสุด *</label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">สร้างนัดหมาย</button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ScheduleNextModal;
