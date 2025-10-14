import React, { useState, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { AiOutlineClose } from 'react-icons/ai';

const SummaryModal = ({ isOpen, onClose, onSubmit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [homework, setHomework] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [createNext, setCreateNext] = useState(false);
  const [nextStartTime, setNextStartTime] = useState('');
  const [nextEndTime, setNextEndTime] = useState('');
  const [nextTitle, setNextTitle] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset fields when modal opens/closes
    if (!isOpen) {
      setSummary('');
      setError('');
      setIsLoading(false);
      setHomework('');
      setNextMeetingDate('');
      setCreateNext(false);
      setNextStartTime('');
      setNextEndTime('');
      setNextTitle('');
      setFiles([]);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!summary) {
      setError('กรุณากรอกสรุปการประชุม');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      // Pass other optional fields (homework, nextMeetingDate) and files to parent
  await onSubmit({ summary, homework, nextMeetingDate, createNext, nextStartTime, nextEndTime, nextTitle, files });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการบันทึก');
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              <p className="mt-4 text-lg font-semibold text-green-600">กำลังบันทึก...</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <AiOutlineClose size={24} />
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">สรุปการประชุม</h2>
          <p className="text-gray-600 mb-6">
            กรุณากรอกสรุปผลการประชุม เพื่อนัดหมายจะถูกเปลี่ยนสถานะเป็น "เสร็จสิ้น"
          </p>

          {error && <p className="text-red-500 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
                สรุปผลการประชุม *
              </label>
              <textarea
                id="summary"
                rows="5"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="เช่น นักศึกษาดำเนินการตามแผน, มอบหมายงานเพิ่มเติม..."
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="homework" className="block text-sm font-medium text-gray-700">งานที่มอบหมาย (ถ้ามี)</label>
              <textarea
                id="homework"
                rows="3"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="เช่น ให้นักศึกษาทำแบบสำรวจ/ส่งรายงาน..."
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="nextMeetingDate" className="block text-sm font-medium text-gray-700">วันที่พบครั้งถัดไป (ถ้ามี)</label>
              <input
                id="nextMeetingDate"
                type="date"
                value={nextMeetingDate ? (String(nextMeetingDate).includes('T') ? String(nextMeetingDate).split('T')[0] : String(nextMeetingDate)) : ''}
                onChange={(e) => setNextMeetingDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">แนบไฟล์ (ถ้ามี)</label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="mt-1 block w-full"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">ไฟล์แนบจะเชื่อมโยงกับสรุปการประชุม</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={createNext} onChange={(e) => setCreateNext(e.target.checked)} disabled={isLoading} />
                <span className="text-sm text-gray-700">สร้างนัดหมายครั้งถัดไปจากข้อมูลด้านล่าง</span>
              </label>

              {createNext && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">หัวข้อสำหรับนัดหมายใหม่</label>
                    <input value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="หัวข้อนัดหมาย" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">เวลาเริ่ม</label>
                      <input type="time" value={nextStartTime} onChange={(e) => setNextStartTime(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">เวลาสิ้นสุด</label>
                      <input type="time" value={nextEndTime} onChange={(e) => setNextEndTime(e.target.value)} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                บันทึกและเสร็จสิ้น
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default SummaryModal;
