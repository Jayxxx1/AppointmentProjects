import React, { useEffect, useMemo, useState } from "react";
import { adminService } from "../../services/adminService";
import { Users, Shield, PlusCircle, Search, Mail, User as UserIcon, Lock, Trash2, Edit } from "lucide-react";
import UserChart from "../../components/Admin/UserChart";

export default function AdminUsersPage() {
  // ---- Admin PIN Gate ----
  const requirePin = (import.meta.env.VITE_REQUIRE_ADMIN_PIN || "0") === "1";
  const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "";
  const [pinInput, setPinInput] = useState("");
  const [unlocked, setUnlocked] = useState(!requirePin || sessionStorage.getItem("adminUnlocked") === "1");
  const [pinError, setPinError] = useState("");

  const submitPin = (e) => {
    e.preventDefault();
    if (!requirePin) { setUnlocked(true); return; }
    if (pinInput && ADMIN_PIN && pinInput === ADMIN_PIN) {
      sessionStorage.setItem("adminUnlocked", "1");
      setUnlocked(true);
      setPinError("");
    } else {
      setPinError("รหัสไม่ถูกต้อง");
    }
  };

  // ---------- Admin state ----------
  const [loading, setLoading] = useState(true);
  const [authErr, setAuthErr] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("all"); // all, teacher, student, admin
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [modalMsg, setModalMsg] = useState({ title: "", content: "", type: "" });
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "teacher",
    fullName: "",
    studentId: "",
  });

  const canCreate = useMemo(() => {
    if (!(form.username.trim() && form.email.trim() && form.password.length >= 6 && form.role)) return false;
    if (form.role === "student" && !form.studentId.trim()) return false;
    return true;
  }, [form]);

  const load = async () => {
    setLoading(true);
    setErr("");
    setAuthErr("");
    try {
      const list = await adminService.listAllUsers(q.trim(), userFilter);
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) setAuthErr("อนุญาตเฉพาะผู้ดูแลระบบเท่านั้น");
      else setErr(e?.response?.data?.message || e?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (unlocked) load(); }, [unlocked, q, userFilter]);

  const createUser = async (e) => {
    e.preventDefault();
    if (!canCreate) return;
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        fullName: form.fullName?.trim() || "",
        studentId: form.role === "student" ? form.studentId.trim() : undefined,
      };
      const newUser = await adminService.createUser(payload);
      setUsers((prev) => [newUser, ...prev]);
      setForm({ username: "", email: "", password: "", role: "teacher", fullName: "", studentId: "" });
      setModalMsg({ title: "สำเร็จ!", content: "เพิ่มผู้ใช้สำเร็จแล้ว", type: "success" });
      setShowModal(true);
    } catch (e) {
      setModalMsg({ title: "เกิดข้อผิดพลาด", content: e?.response?.data?.message || e?.message || "เพิ่มผู้ใช้ไม่สำเร็จ", type: "error" });
      setShowModal(true);
    }
  };

  const handleDeleteClick = (user) => {
    setDeletingUser(user);
    setModalMsg({
      title: "ยืนยันการลบ",
      content: `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user.username}"?`,
      type: "confirm"
    });
    setShowModal(true);
  };

  const deleteUser = async () => {
    if (!deletingUser) return;
    try {
      await adminService.deleteUser(deletingUser._id);
      setUsers(prev => prev.filter(u => u._id !== deletingUser._id));
      setDeletingUser(null);
      setShowModal(false);
      setModalMsg({ title: "สำเร็จ!", content: "ลบผู้ใช้สำเร็จแล้ว", type: "success" });
      setShowModal(true);
    } catch (e) {
      setDeletingUser(null);
      setShowModal(false);
      setModalMsg({ title: "เกิดข้อผิดพลาด", content: e?.response?.data?.message || e?.message || "ลบผู้ใช้ไม่สำเร็จ", type: "error" });
      setShowModal(true);
    }
  };

  const updateUser = async (userId, payload) => {
    try {
      const updated = await adminService.updateUser(userId, payload);
      return updated;
    } catch (e) {
      throw e;
    }
  };

  // Filter users (role + keyword)
  const filteredUsers = useMemo(() => {
    let filtered = users.slice();
    if (userFilter !== "all") filtered = filtered.filter(user => user.role === userFilter);
    if (q.trim()) {
      const search = q.trim().toLowerCase();
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.fullName?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [users, userFilter, q]);

  // Stats
  const userStats = useMemo(() => {
    const stats = { total: users.length, admin: 0, teacher: 0, student: 0 };
    users.forEach(user => {
      if (user.role) stats[user.role]++;
    });
    return stats;
  }, [users]);

  // Gates
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" /> เข้าสู่พื้นที่ผู้ดูแลระบบ
              </h2>
            </div>
            <form onSubmit={submitPin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รหัสเฉพาะแอดมิน</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="ใส่รหัส"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {pinError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{pinError}</div>}
              <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md">
                เข้าสู่ระบบแอดมิน
              </button>
              <p className="text-xs text-gray-500">* เซิร์ฟเวอร์ยังตรวจ role=admin ซ้ำอีกชั้น</p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat">
        <div className="bg-white rounded-lg border border-gray-200 p-6">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4  bg-cover bg-center bg-no-repeat min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
        <Users className="w-6 h-6" /> จัดการผู้ใช้
      </h1>

      {authErr && <div className="text-red-600">{authErr}</div>}
      {err && <div className="text-red-600">{err}</div>}

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard label="ทั้งหมด" value={userStats.total} />
        <StatCard label="ผู้ดูแลระบบ" value={userStats.admin} />
        <StatCard label="อาจารย์" value={userStats.teacher} />
        <StatCard label="นักศึกษา" value={userStats.student} />
      </div>

      {/* User Chart */}
      <div className="mt-4">
        <UserChart users={users} days={90} />
      </div>

      {/* Create User Form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> เพิ่มผู้ใช้
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={createUser} className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ใช้</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="เช่น jdoe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="เช่น jdoe@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="teacher">อาจารย์</option>
                <option value="student">นักศึกษา</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล (ถ้ามี)</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="เช่น สมชาย ใจดี"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">รหัสนักศึกษา (แสดงเมื่อ role=student)</label>
              {/*
                When role=student allow entry of student ID.  To prevent abuse, we strip all non-digit characters and cap
                the length to 10 digits (typical student ID length).  We also set inputMode and pattern hints for mobile
                keyboards.  Previously this field allowed arbitrary text which could send invalid identifiers to the server.
              */}
              <input
                value={form.studentId}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, studentId: numeric });
                }}
                placeholder={form.role === "student" ? "กรอกรหัส นศ." : "— เลือก role=student เพื่อกรอก —"}
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${form.role === "student" ? "border-gray-300 bg-white" : "border-dashed bg-gray-50 text-gray-400"}`}
                disabled={form.role !== "student"}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-6">
              <button
                type="submit"
                disabled={!canCreate}
                className={`px-6 py-2 rounded-md font-medium ${canCreate ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
              >
                เพิ่มผู้ใช้
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาผู้ใช้ (ชื่อ/อีเมล/ชื่อเต็ม)"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">บทบาททั้งหมด</option>
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="teacher">อาจารย์</option>
              <option value="student">นักศึกษา</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">รายการผู้ใช้</h3>
            <span className="text-sm text-gray-500">แสดง {filteredUsers.length} / {users.length} คน</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อผู้ใช้</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">บทบาท</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สร้างเมื่อ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูล</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <UserRow
                    key={user._id}
                    user={user}
                    onDelete={() => handleDeleteClick(user)}
                    onEdit={() => setEditingUser(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Edit and Delete Modals are now rendered here */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          updateUser={updateUser}
          onSaved={(updated) => {
            setUsers(prev => prev.map(u => (u._id === updated._id ? { ...u, ...updated } : u)));
            setEditingUser(null);
            setModalMsg({ title: "สำเร็จ!", content: "อัปเดตผู้ใช้สำเร็จแล้ว", type: "success" });
            setShowModal(true);
          }}
        />
      )}

      {showModal && (
        <CustomModal
          title={modalMsg.title}
          content={modalMsg.content}
          type={modalMsg.type}
          onClose={() => setShowModal(false)}
          onConfirm={deleteUser}
        />
      )}
    </div>
  );
}

// --- Reusable Components ---

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function UserRow({ user, onDelete, onEdit }) {
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'teacher': return 'อาจารย์';
      case 'student': return 'นักศึกษา';
      default: return role || '-';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'teacher': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'student': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.username || '-'}</div>
            {user.fullName && <div className="text-sm text-gray-500">{user.fullName}</div>}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-gray-900">{user.email || '-'}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${getRoleColor(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-900">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-1 rounded text-blue-600 hover:bg-blue-50"
            title="แก้ไขผู้ใช้"
          >
            <Edit className="w-4 h-4" />
          </button>
          {user.role !== 'admin' && (
            <button
              onClick={onDelete}
              className="p-1 rounded text-red-600 hover:bg-red-50"
              title="ลบผู้ใช้"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditUserModal({ user, onClose, onSaved, updateUser }) {
  const [form, setForm] = React.useState({
    username: "",
    email: "",
    password: "",
    role: "teacher",
    fullName: "",
    studentId: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        email: user.email || "",
        password: "",
        role: user.role || "teacher",
        fullName: user.fullName || "",
        studentId: user.studentId || "",
      });
    }
  }, [user]);

  const canSave = React.useMemo(() => {
    if (!form.username.trim() || !form.email.trim() || !form.role) return false;
    if (form.role === "student" && !form.studentId.trim()) return false;
    return true;
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSave || !user?._id) return;
    setSaving(true);
    setErr("");
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        fullName: form.fullName?.trim() || "",
        status: form.status,
      };
      if (form.role === "student") payload.studentId = form.studentId.trim();
      else payload.studentId = undefined; // ให้ backend ลบได้ถ้าไม่ใช่นักศึกษา

      // ถ้า password ไม่ว่าง -> อัปเดต
      if (form.password && form.password.length >= 6) {
        payload.password = form.password;
      }

      const updated = await updateUser(user._id, payload);
      onSaved(updated);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-lg border border-gray-200 shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">แก้ไขผู้ใช้</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{err}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ใช้</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">บทบาท</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="teacher">อาจารย์</option>
                <option value="student">นักศึกษา</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ-นามสกุล</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">รหัสนักศึกษา (แสดงเมื่อ role=student)</label>
              <input
                value={form.studentId}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm({ ...form, studentId: numeric });
                }}
                placeholder={form.role === "student" ? "กรอกรหัส นศ." : "— เลือก role=student เพื่อกรอก —"}
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${form.role === "student" ? "border-gray-300 bg-white" : "border-dashed bg-gray-50 text-gray-400"}`}
                disabled={form.role !== "student"}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSave || saving}
              className={`px-5 py-2 rounded-md text-white ${canSave && !saving ? "bg-blue-600" : "bg-gray-300 cursor-not-allowed"}`}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomModal({ title, content, type, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-700">{content}</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          {type === "confirm" && (
            <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white">ยืนยัน</button>
          )}
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium rounded-md ${type === "confirm" ? "bg-gray-200 text-gray-700" : "bg-blue-600 text-white"}`}>
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
