import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { AiOutlineClose } from 'react-icons/ai';

const RescheduleModal = ({ isOpen, onClose, onSubmit, appointment }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (appointment) {
      setDate(appointment.date || '');
      setStartTime(appointment.startTime || '');
      setEndTime(appointment.endTime || '');
    }
    // Reset fields when modal opens/closes
    if (!isOpen) {
      setReason('');
      setError('');
      setIsLoading(false);
    }
  }, [appointment, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!date || !startTime || !endTime || !reason) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onSubmit({ date, startTime, endTime, reason });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 md:p-8 m-4">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl z-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-lg font-semibold text-blue-600">กำลังส่งคำขอ...</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <AiOutlineClose size={24} />
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">ขอเลื่อนนัดหมาย</h2>
          
          {/* Display current appointment details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-600 mb-2">นัดหมายปัจจุบัน:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>วันที่:</strong> {appointment?.date}</p>
              <p><strong>เวลา:</strong> {appointment?.startTime} - {appointment?.endTime}</p>
            </div>
          </div>

          {error && <p className="text-red-500 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">วันที่</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">เวลาเริ่ม</label>
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">เวลาสิ้นสุด</label>
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">เหตุผล</label>
              <textarea
                id="reason"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="กรุณาระบุเหตุผลในการขอเลื่อนนัด"
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                ส่งคำขอ
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RescheduleModal;
