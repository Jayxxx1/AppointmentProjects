import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { meetingSummaryService } from '../../services/meetingSummaryService';
import { useAuth } from '../../contexts/AuthContext.jsx';
import AppointmentAttachments from '../../components/AppointmentAttachments';
import ScheduleNextModal from '../../components/Modal/ScheduleNextModal.jsx';
import { attachmentService } from '../../services/attachmentService';

export default function MeetSummaryDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openSchedule, setOpenSchedule] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await meetingSummaryService.get(id);
        if (!alive) return;
        setDoc(data);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div>กำลังโหลด...</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!doc) return <div>ไม่พบสรุปการประชุม</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">สรุปการประชุม</h1>
      <div className="mb-4 text-gray-700">Project: {doc.project?.name}</div>
      <div className="mb-4">
        <h3 className="font-semibold">สรุป</h3>
        <p className="whitespace-pre-wrap">{doc.summary}</p>
      </div>
      {doc.homework && (
        <div className="mb-4">
          <h3 className="font-semibold">งานที่มอบหมาย</h3>
          <p>{doc.homework}</p>
        </div>
      )}
      <div className="mb-4">
        <h3 className="font-semibold">ไฟล์แนบ (ก่อนประชุม)</h3>
        {doc.appointment ? <AppointmentAttachments ownerId={doc.appointment._id} /> : <div>—</div>}
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">ไฟล์แนบ (สรุป)</h3>
                {Array.isArray(doc.attachments) && doc.attachments.length > 0 ? (
          <ul>
            {doc.attachments.map(a => (
              <li key={a._id} className="flex items-center justify-between py-1">
                <span className="text-blue-600">{a.originalName}</span>
                <div>
                  <button onClick={async () => { try { await attachmentService.download(a._id, a.originalName); } catch (e) { alert('ดาวน์โหลดล้มเหลว'); } }} className="text-sm text-blue-600 hover:underline mr-4">ดาวน์โหลด</button>
                  <button onClick={async () => {
                    try {
                      if (!window.confirm('ยืนยันการลบไฟแนบนี้หรือไม่?')) return;
                      await attachmentService.remove(a._id);
                      const updated = await meetingSummaryService.get(id);
                      setDoc(updated);
                    } catch (e) {
                      alert(e?.response?.data?.message || e?.message || 'ลบไฟล์ไม่สำเร็จ');
                    }
                  }} className="ml-4 text-sm text-red-600">ลบ</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <div>—</div>}
      </div>

      <div className="flex justify-end">
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <button onClick={() => setOpenSchedule(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Schedule Next Appointment</button>
        )}
      </div>

      <ScheduleNextModal isOpen={openSchedule} onClose={() => setOpenSchedule(false)} defaultProjectId={doc.project?._id} defaultDate={doc.nextMeetingDate ? (String(doc.nextMeetingDate).split('T')[0]) : ''} />
    </div>
  );
}
