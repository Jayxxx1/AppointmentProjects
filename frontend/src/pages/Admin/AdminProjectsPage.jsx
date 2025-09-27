import React, { useEffect, useState, useMemo } from 'react';
import { projectService } from '../../services/projectService';
import { Link } from 'react-router-dom';
import { RefreshCw, Search, CalendarClock } from 'lucide-react';

/**
 * AdminProjectsPage lists all projects in the system.  Administrators can
 * search by project name, advisor name, or year.  Each row links to the
 * project detail page for viewing or editing (subject to role).
 */
export default function AdminProjectsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectService.list();
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
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((p) => {
      const name = String(p.name || '').toLowerCase();
      const adv = String(p.advisor?.username || p.advisor?.fullName || '').toLowerCase();
      const year = String(p.academicYear || '').toLowerCase();
      return name.includes(t) || adv.includes(t) || year.includes(t);
    });
  }, [items, q]);

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
          <h1 className="text-2xl font-semibold text-gray-900">จัดการโปรเจคทั้งหมด</h1>
          <p className="text-sm text-gray-600 mt-1">รายการโปรเจคทั้งหมดในระบบ</p>
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
              placeholder="ค้นหา: ชื่อโปรเจค / อาจารย์ / ปีการศึกษา"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-gray-500" />
              รายการโปรเจคทั้งหมด
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
                <Th>ชื่อโปรเจค</Th>
                <Th>ที่ปรึกษา</Th>
                <Th>ปีการศึกษา</Th>
                <Th>สมาชิก</Th>
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
                    ไม่พบโปรเจค
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <Td className="font-medium text-gray-900">
                      <Link to={`/projects/details/${p._id}`} className="text-blue-600 hover:underline">
                        {p.name || '-'}
                      </Link>
                    </Td>
                    <Td>{p.advisor?.fullName || p.advisor?.username || '-'}</Td>
                    <Td>{p.academicYear || '-'}</Td>
                    <Td>{(p.members?.length || 0) + 1}</Td>
                    <Td className="text-right">
                      <Link to={`/projects/details/${p._id}`} className="text-blue-600 hover:underline">
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
