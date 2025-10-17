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

  const createdAt = doc.createdAt ? new Date(doc.createdAt).toLocaleString() : null;
  const advisor = doc.project?.advisor;
  const advisorName = advisor ? (advisor.fullName || advisor.username || advisor.email || '-') : '-';

  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen flex items-start py-12">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">สรุปการประชุม</h1>
              <div className="text-sm text-gray-600">Project: <span className="font-medium text-gray-800">{doc.project?.name || '-'}</span></div>
              <div className="text-sm text-gray-600">อาจารย์ที่ปรึกษา: <span className="font-medium text-gray-800">{advisorName}</span></div>
              {createdAt && <div className="text-sm text-gray-500">สร้างเมื่อ: {createdAt}</div>}
            </div>
            <div className="text-right">
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <button onClick={() => setOpenSchedule(true)} className="px-3 py-2 bg-blue-600 text-white rounded">นัดหมายครั้งถัดไป</button>
              )}
            </div>
          </div>

          <hr className="my-4" />

          <section className="mb-4">
            <h3 className="font-semibold mb-2">สรุป</h3>
            <p className="whitespace-pre-wrap text-gray-800">{doc.summary || '—'}</p>
          </section>

          {doc.homework && (
            <section className="mb-4">
              <h3 className="font-semibold mb-2">งานที่มอบหมาย</h3>
              <p className="text-gray-800">{doc.homework}</p>
            </section>
          )}

          <section className="mb-4">
            <h3 className="font-semibold mb-2">ไฟล์แนบ (ก่อนประชุม)</h3>
            <div className="pl-2">
              {doc.appointment ? (
                <AppointmentAttachments ownerId={doc.appointment._id} />
              ) : (
                <div className="text-gray-500">—</div>
              )}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="font-semibold mb-2">ไฟล์แนบ (สรุป)</h3>
            {Array.isArray(doc.attachments) && doc.attachments.length > 0 ? (
              <ul className="divide-y">
                {doc.attachments.map(a => (
                  <li key={a._id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8 2a2 2 0 00-2 2v9a4 4 0 108 0V7a2 2 0 10-4 0v6a2 2 0 104 0V4a4 4 0 10-8 0v9a6 6 0 1112 0v1a1 1 0 11-2 0v-1a4 4 0 10-8 0V4a2 2 0 012-2h0z"/></svg>
                      <span className="text-gray-800">{a.originalName}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button onClick={async () => { try { await attachmentService.download(a._id, a.originalName); } catch (e) { alert('ดาวน์โหลดล้มเหลว'); } }} className="text-sm text-blue-600 hover:underline">ดาวน์โหลด</button>
                      <button onClick={async () => {
                        try {
                          if (!window.confirm('ยืนยันการลบไฟแนบนี้หรือไม่?')) return;
                          await attachmentService.remove(a._id);
                          const updated = await meetingSummaryService.get(id);
                          setDoc(updated);
                        } catch (e) {
                          alert(e?.response?.data?.message || e?.message || 'ลบไฟล์ไม่สำเร็จ');
                        }
                      }} className="text-sm text-red-600">ลบ</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500">—</div>
            )}
          </section>

          <ScheduleNextModal isOpen={openSchedule} onClose={() => setOpenSchedule(false)} defaultProjectId={doc.project?._id} defaultDate={doc.nextMeetingDate ? (String(doc.nextMeetingDate).split('T')[0]) : ''} />
        </div>
      </div>
    </div>
  );
}
