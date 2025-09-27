import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { appointmentService } from "../../services/appointmentService";
import { Loader2, CalendarClock, CheckCircle2, Clock, XCircle, RefreshCw, ListChecks, AlertTriangle, Filter, Search } from "lucide-react";
import AppointmentChart from "./AppointmentChart";


export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date"); // date | createdAt

  // Fetch ALL appointments (no params).  Admins see everything, so use listAll().
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      // listAll returns an array of appointments (limited fields)
      const data = await appointmentService.listAll();
      setItems(Array.isArray(data) ? data : (data?.appointments || []));
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchAll();
    })();

    // Optional: light auto-refresh every 60s to keep the dashboard fresh
    const t = setInterval(fetchAll, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Helpers
  const toDate = (it) => {
    // Many of our docs store separate date (YYYY-MM-DD) + startTime (HH:mm)
    const d = it?.date || it?.startDate || it?.scheduledDate; // fallbacks
    const s = it?.startTime || "00:00";
    if (!d) return null;
    // Build local datetime using Asia/Bangkok implicitly (browser local)
    try {
      const [Y, M, D] = d.split("-").map(Number);
      const [h, m] = String(s).split(":").map(Number);
      return new Date(Y, (M || 1) - 1, D || 1, h || 0, m || 0, 0, 0);
    } catch {
      return it?.createdAt ? new Date(it.createdAt) : null;
    }
  };

  const statusLabel = (s) => {
    switch (s) {
      case "pending": return { text: "รอดำเนินการ", color: "bg-orange-50 text-orange-700 border-orange-200" };
      case "approved": return { text: "อนุมัติแล้ว", color: "bg-green-50 text-green-700 border-green-200" };
      case "reschedule_requested": return { text: "ขอเลื่อนนัด", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "rejected": return { text: "ถูกปฏิเสธ", color: "bg-red-50 text-red-700 border-red-200" };
      case "cancelled": return { text: "ยกเลิก", color: "bg-gray-50 text-gray-600 border-gray-200" };
      case "expired": return { text: "หมดอายุ", color: "bg-gray-50 text-gray-600 border-gray-200" };
      default: return { text: s || "-", color: "bg-gray-50 text-gray-600 border-gray-200" };
    }
  };

  // Derived metrics
  const metrics = useMemo(() => {
    const m = {
      total: items.length,
      pending: 0,
      approved: 0,
      reschedule_requested: 0,
      rejected: 0,
      cancelled: 0,
      expired: 0,
      upcomingWithin7d: 0,
    };
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (const it of items) {
      const s = it?.status || "";
      if (m[s] !== undefined) m[s]++;
      const dt = toDate(it);
      if (dt && dt >= now && dt <= in7) m.upcomingWithin7d++;
    }
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    let arr = items.slice();
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((it) =>
        String(it.title || "").toLowerCase().includes(t) ||
        String(it.description || "").toLowerCase().includes(t) ||
        String(it.location || "").toLowerCase().includes(t)
      );
    }
    if (statusFilter !== "all") {
      arr = arr.filter((it) => (it.status || "").toLowerCase() === statusFilter);
    }
    if (sortKey === "date") {
      arr.sort((a, b) => {
        const da = toDate(a)?.getTime() || 0;
        const db = toDate(b)?.getTime() || 0;
        return da - db;
      });
    } else if (sortKey === "createdAt") {
      arr.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    return arr;
  }, [items, q, statusFilter, sortKey]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return items
      .map((it) => ({ it, dt: toDate(it) }))
      .filter(({ dt }) => dt && dt >= now)
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 5)
      .map(({ it }) => it);
  }, [items]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">แดชบอร์ด Admin</h1>
          <p className="text-sm text-gray-600 mt-1">ภาพรวมการนัดหมายทั้งหมด</p>
        </div>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={CalendarClock} label="นัดหมายทั้งหมด" value={metrics.total} color="gray" />
        <MetricCard icon={Clock} label="รอดำเนินการ" value={metrics.pending} color="orange" />
        <MetricCard icon={CheckCircle2} label="อนุมัติแล้ว" value={metrics.approved} color="green" />
        <MetricCard icon={AlertTriangle} label="ภายใน 7 วัน" value={metrics.upcomingWithin7d} color="blue" />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MiniStat label="ขอเลื่อนนัด" value={metrics.reschedule_requested} />
        <MiniStat label="ถูกปฏิเสธ" value={metrics.rejected} />
        <MiniStat label="ยกเลิก" value={metrics.cancelled} />
        <MiniStat label="หมดอายุ" value={metrics.expired} />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหา: ชื่อเรื่อง / สถานที่ / คำอธิบาย"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3">
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
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="date">เรียงตามวันนัด</option>
              <option value="createdAt">เรียงตามวันที่สร้าง</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointment chart (replaces upcoming list) */}
      <div className="mb-6">
        <AppointmentChart items={items} days={30} />
      </div>

      {/* Data table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
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
                <Th>วัน-เวลา</Th>
                <Th>หัวข้อ</Th>
                <Th className="hidden md:table-cell">สถานที่</Th>
                <Th>สถานะ</Th>
                <Th className="hidden lg:table-cell">ผู้สร้าง</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังโหลด…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-red-600">{error}</td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    ไม่พบข้อมูลตามที่ค้นหา/กรอง
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.map((it) => (
                <Row key={it._id || it.id} it={it} toDate={toDate} statusLabel={statusLabel} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Small components
function Th({ children, className = "" }) {
  return (
    <th className={`text-left font-medium text-gray-900 px-6 py-3 ${className}`}>
      {children}
    </th>
  );
}

function MetricCard({ icon: Icon, label, value, color = "gray" }) {
  const colors = {
    gray: "bg-white border-gray-200",
    orange: "bg-white border-orange-200",
    green: "bg-white border-green-200", 
    blue: "bg-white border-blue-200"
  };
  
  return (
    <div className={`rounded-lg border ${colors[color]} p-6`}>
      <div className="flex items-center">
        <Icon className="w-8 h-8 text-gray-600 mr-4" />
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function UpcomingCard({ it, toDate, statusLabel }) {
  const dt = toDate(it);
  const s = statusLabel(it.status);
  const dateStr = dt ? dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-";
  
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div>
        <div className="font-medium text-gray-900">{it.title || "(ไม่มีชื่อเรื่อง)"}</div>
        <div className="text-sm text-gray-600">{dateStr}</div>
        {it.location && <div className="text-sm text-gray-500">สถานที่: {it.location}</div>}
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${s.color}`}>
          {s.text}
        </span>
        <Link 
          to={`/appointments/${it._id || it.id}`} 
          className="text-sm text-blue-600 font-medium"
        >
          ดู →
        </Link>
      </div>
    </div>
  );
}

function Row({ it, toDate, statusLabel }) {
  const dt = toDate(it);
  const dateStr = dt ? dt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-";
  const s = statusLabel(it.status);
  const creatorName = it?.creator?.fullName || it?.creator?.username || it?.creator?.email || "-";

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{dateStr}</td>
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{it.title || "(ไม่มีชื่อเรื่อง)"}</div>
        {it.description && <div className="text-sm text-gray-500">{it.description}</div>}
      </td>
      <td className="px-6 py-4 hidden md:table-cell text-gray-900">{it.location || "-"}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${s.color}`}>
          {s.text}
        </span>
      </td>
      <td className="px-6 py-4 hidden lg:table-cell text-gray-900">{creatorName}</td>
      <td className="px-6 py-4 text-right">
        <Link to={`/appointments/${it._id || it.id}`} className="text-sm text-blue-600 font-medium">
          รายละเอียด
        </Link>
      </td>
    </tr>
  );
}
