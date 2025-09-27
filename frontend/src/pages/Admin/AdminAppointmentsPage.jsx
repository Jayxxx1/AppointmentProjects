import React, { useEffect, useState, useMemo } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { Link } from 'react-router-dom';
import { CalendarClock, RefreshCw, Search, Filter } from 'lucide-react';

/**
 * AdminAppointmentsPage displays a list of all appointments in the system.
 */
export default function AdminAppointmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await appointmentService.listAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((it) =>
        String(it.title || '').toLowerCase().includes(t) ||
        String(it.project?.name || '').toLowerCase().includes(t)
      );
    }
    if (statusFilter !== 'all') {
      arr = arr.filter((it) => (it.status || '').toLowerCase() === statusFilter);
    }
    return arr;
  }, [items, q, statusFilter]);

  // Helper component for status badges
  const StatusBadge = ({ status }) => {
    let text = 'ไม่ทราบ';
    let color = 'bg-slate-100 text-slate-700';

    switch (status) {
      case 'pending':
        text = 'รอดำเนินการ';
        color = 'bg-amber-100 text-amber-800';
        break;
      case 'approved':
        text = 'อนุมัติแล้ว';
        color = 'bg-emerald-100 text-emerald-800';
        break;
      case 'reschedule_requested':
        text = 'ขอเลื่อนนัด';
        color = 'bg-sky-100 text-sky-800';
        break;
      case 'rejected':
        text = 'ถูกปฏิเสธ';
        color = 'bg-rose-100 text-rose-800';
        break;
      case 'cancelled':
        text = 'ยกเลิก';
        color = 'bg-gray-100 text-gray-600';
        break;
      case 'expired':
        text = 'หมดอายุ';
        color = 'bg-neutral-100 text-neutral-700';
        break;
      default:
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {text}
      </span>
    );
  };

  // Helper components for table cells
  const Th = ({ children, className = '' }) => (
    <th className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
  
  const Td = ({ children, className = '' }) => (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`}>{children}</td>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">จัดการนัดหมายทั้งหมด</h1>
          <p className="text-sm text-gray-600 mt-1">ภาพรวมและรายการนัดหมายทั้งหมดในระบบ</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา: ชื่อเรื่อง หรือ โปรเจค"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="reschedule_requested">ขอเลื่อนนัด</option>
              <option value="rejected">ถูกปฏิเสธ</option>
              <option value="cancelled">ยกเลิก</option>
              <option value="expired">หมดอายุ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-gray-500" />
              รายการนัดหมายทั้งหมด
            </h2>
            <div className="text-sm text-gray-500">
              แสดง {filtered.length} / {items.length} รายการ
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>หัวข้อ</Th>
                <Th>โปรเจค</Th>
                <Th>สถานะ</Th>
                <Th>วันที่</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      กำลังโหลด…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    ไม่พบนัดหมาย
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="font-medium text-gray-900">
                      <Link to={`/appointments/${it._id}`} className="text-blue-600 hover:underline">
                        {it.title || '-'}
                      </Link>
                    </Td>
                    <Td>{it.project?.name || '-'}</Td>
                    <Td>
                      <StatusBadge status={it.status} />
                    </Td>
                    <Td>{it.startAt ? new Date(it.startAt).toLocaleString('th-TH') : '-'}</Td>
                    <Td className="text-right">
                      <Link to={`/appointments/${it._id}`} className="text-blue-600 hover:underline">
                        ดูรายละเอียด
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}