import React, { useEffect, useState } from 'react';
import { attachmentService } from '../services/attachmentService';

export default function AppointmentAttachments({ ownerId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!ownerId) {
          setFiles([]);
          return;
        }
  // attachmentService.list expects (ownerType, ownerId)
  const data = await attachmentService.list('appointment', ownerId);
        if (!alive) return;
        setFiles(Array.isArray(data) ? data : []);
        setErr('');
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || 'ไม่สามารถโหลดไฟล์ได้');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ownerId]);

  if (loading) return <div className="text-sm text-gray-500">กำลังโหลดไฟล์แนบ...</div>;
  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (!files || files.length === 0) return <p className="text-sm text-gray-500">— ไม่มี —</p>;

  return (
    <ul className="space-y-2">
      {files.map(f => (
        <li key={f._id} className="flex items-center justify-between py-1">
          <a href={attachmentService.downloadUrl(f._id)} className="text-blue-600 hover:underline">{f.originalName || f.filename || 'ดาวน์โหลดไฟล์'}</a>
          <div>
            <button onClick={async () => {
              try {
                if (!window.confirm('ยืนยันการลบไฟล์นี้หรือไม่?')) return;
                await attachmentService.remove(f._id);
                const data = await attachmentService.list('appointment', ownerId);
                setFiles(Array.isArray(data) ? data : []);
              } catch (e) {
                alert(e?.response?.data?.message || e?.message || 'ลบไฟล์ไม่สำเร็จ');
              }
            }} className="ml-4 text-sm text-red-600">ลบ</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
