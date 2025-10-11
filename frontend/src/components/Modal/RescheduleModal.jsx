import React, { useState } from 'react';
import ModalPortal from './ModalPortal';

export default function RescheduleModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!date || !startTime || !endTime) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (startTime >= endTime) {
      setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }
    onSubmit({ date, startTime, endTime, reason });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-2xl font-bold mb-4">ขอเลื่อนนัดหมาย</h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">วันที่เสนอใหม่ *</label>
                <input type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">เวลาเริ่ม *</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">เวลาสิ้นสุด *</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">เหตุผล (ไม่บังคับ)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isLoading} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">ยกเลิก</button>
              <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                {isLoading ? 'กำลังส่ง...' : 'ส่งคำขอ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
