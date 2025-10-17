import React, { useEffect, useState } from "react";
import { meetingSummaryService } from "../../services/meetingSummaryService";
import { Link } from "react-router-dom";

export default function AdminMeetingSummariesPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
  const data = await meetingSummaryService.list();
  setSummaries(Array.isArray(data) ? data : (data?.summaries || []));
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "โหลดข้อมูลสรุปประชุมล้มเหลว");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">สรุปการประชุมทั้งหมด (Admin)</h1>
      {loading ? (
        <div className="text-center text-gray-500">กำลังโหลด...</div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-white rounded-lg border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">โปรเจค</th>
                <th className="px-4 py-2 text-left">กลุ่ม/ปี</th>
                <th className="px-4 py-2 text-left">อาจารย์ที่ปรึกษา</th>
                <th className="px-4 py-2 text-left">นัดหมาย</th>
                <th className="px-4 py-2 text-left">วันที่สรุป</th>
                <th className="px-4 py-2 text-left">ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summaries.map((s) => (
                <tr key={s._id || s.id}>
                  <td className="px-4 py-2">{s.project?.name || "-"}</td>
                  <td className="px-4 py-2">{s.project?.group || s.project?.academicYear || "-"}</td>
                  <td className="px-4 py-2">{s.project?.advisor?.fullName || s.project?.advisor?.username || s.project?.advisor?.email || "-"}</td>
                  <td className="px-4 py-2">
                    {s.appointment ? (
                      <Link to={`/appointments/${s.appointment?._id || s.appointment}`} className="text-blue-600 underline">นัดหมาย</Link>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-2">{s.createdAt ? new Date(s.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : "-"}</td>
                  <td className="px-4 py-2">
                    <Link to={`/meetsummary/${s._id || s.id}`} className="text-blue-600 font-medium">ดูสรุป</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
