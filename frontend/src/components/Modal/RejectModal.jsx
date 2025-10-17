import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { AiOutlineClose } from 'react-icons/ai';

const RejectModal = ({ isOpen, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset fields when modal opens/closes
    if (!isOpen) {
      setReason('');
      setNote('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!reason) {
      setError('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onSubmit({ reason, note });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 md:p-8 m-4">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col justify-center items-center rounded-2xl z-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p className="mt-4 text-lg font-semibold text-red-600">กำลังดำเนินการ...</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <AiOutlineClose size={24} />
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">ปฏิเสธนัดหมาย</h2>
          <p className="text-gray-600 mb-6">กรุณาระบุเหตุผลในการปฏิเสธนัดหมายนี้</p>

          {error && <p className="text-red-500 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                เหตุผลในการปฏิเสธ *
              </label>
              <input
                type="text"
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="เช่น ติดธุระด่วน, ข้อมูลไม่ครบถ้วน"
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                หมายเหตุเพิ่มเติม (ถ้ามี)
              </label>
              <textarea
                id="note"
                rows="3"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="คำแนะนำเพิ่มเติมสำหรับนักศึกษา"
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-lg shadow-md hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default RejectModal;
