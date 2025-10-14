import React, { useEffect, useState } from 'react';
import { meetingSummaryService } from '../../services/meetingSummaryService';
import { attachmentService } from '../../services/attachmentService';
import { Link } from 'react-router-dom';
import ScheduleNextModal from '../../components/Modal/ScheduleNextModal.jsx';
import AppointmentAttachments from '../../components/AppointmentAttachments.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function MeetSumPage() {
  const [items, setItems] = useState([]);
  const [openScheduleFor, setOpenScheduleFor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await meetingSummaryService.list();
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        setErr('');
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || 'โหลดข้อมูลสรุปการประชุมไม่สำเร็จ');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute inset-0 bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat bg-fixed blur-sm" />
      <div className="relative z-10 max-w-6xl w-full mx-auto px-5 sm:px-8 py-10">
        <div className="bg-white/95 rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold mb-4">สรุปการประชุม / Meeting Summaries</h1>
          {err && <div className="text-red-600 mb-4">{err}</div>}
          {loading ? (
            <div>กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="text-gray-600">ยังไม่มีสรุปการประชุม</div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it._id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{it.project?.name || it.appointment?.title || 'สรุปการประชุม'}</h3>
                      <div className="text-sm text-gray-600">โดย {it.createdBy?.fullName || it.createdBy?.username || '—'} • {new Date(it.createdAt).toLocaleString('th-TH')}</div>
                    </div>
                    <div className="text-right">
                      {it.appointment && (
                        <Link to={`/appointments/${it.appointment._id}`} className="text-blue-600 hover:underline">ดูนัดหมาย</Link>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-gray-700">
                    <p className="font-medium">สรุป:</p>
                    <p className="whitespace-pre-wrap">{it.summary}</p>
                  </div>

                  {it.homework && (
                    <div className="mt-3 text-gray-700">
                      <p className="font-medium">งานที่มอบหมาย:</p>
                      <p className="whitespace-pre-wrap">{it.homework}</p>
                    </div>
                  )}

                  {it.nextMeetingDate && (
                    <div className="mt-3 text-gray-700">
                      <p className="font-medium">วันนัดหมายครั้งถัดไป:</p>
                      <p>{new Date(it.nextMeetingDate).toLocaleDateString('th-TH')}</p>
                    </div>
                  )}
                  {/* Attachments: show appointment attachments (old) and summary attachments (new) */}
                  <div className="mt-3 grid gap-3">
                    <div>
                      <p className="font-medium">ไฟล์แนบ (ก่อนประชุม)</p>
                      {it.appointment ? (
                        <AppointmentAttachments ownerId={it.appointment._id} />
                      ) : <p className="text-sm text-gray-500">— ไม่มี —</p>}
                    </div>

                    <div>
                      <p className="font-medium">ไฟล์แนบ (สรุปการประชุม)</p>
                      {Array.isArray(it.attachments) && it.attachments.length > 0 ? (
                        <ul className="space-y-2">
                          {it.attachments.map(a => (
                            <li key={a._id || a}><a href={attachmentService.downloadUrl(a._id || a)} className="text-blue-600 hover:underline">{a.originalName || 'ดาวน์โหลดไฟล์'}</a></li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-500">— ไม่มี —</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                      <button onClick={() => setOpenScheduleFor(it)} className="px-3 py-2 bg-blue-500 text-white rounded-lg">Schedule Next</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ScheduleNextModal isOpen={!!openScheduleFor} defaultProjectId={openScheduleFor?.project?._id || openScheduleFor?.project} defaultDate={openScheduleFor?.nextMeetingDate ? (String(openScheduleFor.nextMeetingDate).includes('T') ? String(openScheduleFor.nextMeetingDate).split('T')[0] : String(openScheduleFor.nextMeetingDate)) : ''} onClose={() => setOpenScheduleFor(null)} onCreated={(created) => { setOpenScheduleFor(null); setFeedbackMsg('สร้างนัดหมายครั้งถัดไปเรียบร้อย'); setShowFeedback(true); }} />
    </div>
  );
}
