import React, { useState } from 'react';

export default function CancelReasonModal({ isOpen, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
      setLocalSubmitting(false);
    }
  }, [isOpen]);

  const handle = async () => {
    setError('');
    if (!reason || String(reason).trim().length === 0) {
      setError('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }
    setLocalSubmitting(true);
    try {
      // onSubmit is expected to throw on error or return normally
      await onSubmit({ reason });
    } catch (e) {
      // Try to show server-provided message in the modal
      const msg = e?.response?.data?.message || e?.message || 'ไม่สามารถส่งเหตุผลได้';
      setError(msg);
    } finally {
      setLocalSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!localSubmitting && !submitting) onClose(); }}></div>
      <div className="bg-white rounded-xl shadow-xl z-10 w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-3">เหตุผลการยกเลิก</h3>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} className="w-full p-3 border rounded-md" placeholder="ระบุเหตุผลที่จะส่งให้อาจารย์"></textarea>
        {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={() => { if (!localSubmitting && !submitting) onClose(); }} className="px-4 py-2 rounded-md bg-gray-200">ยกเลิก</button>
          <button onClick={handle} disabled={localSubmitting || submitting} className="px-4 py-2 rounded-md bg-red-500 text-white">{localSubmitting || submitting ? 'กำลังส่ง...' : 'ยืนยันการยกเลิก'}</button>
        </div>
      </div>
    </div>
  );
}
