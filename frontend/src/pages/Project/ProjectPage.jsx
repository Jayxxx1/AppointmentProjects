import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { projectService } from "../../services/projectService.js";
import { Users, GraduationCap, Calendar as Cal, PlusCircle, Trash2, Pencil, FileText } from "lucide-react";

export default function ProjectsPage() {
  const { user, role } = useAuth() || {};
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const isStudent = role === 'student';
  const hasProject = projects.length > 0;
  const canCreateProject = !isStudent || (isStudent && !hasProject);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await projectService.listMine();
        if (!alive) return;
        setProjects(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const canDelete = (p, user, role) => {
    const uid = user?._id || user?.id;
    const createdBy = p?.createdBy?._id || p?.createdBy;
    return role === 'admin' || String(createdBy || '') === String(uid || '');
  };

  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  const statusGrad = (s) => {
    switch ((s || "active").toLowerCase()) {
      case "archived": return "from-gray-400 to-gray-600";
      default: return "from-green-500 to-emerald-600";
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("ยืนยันลบโปรเจคนี้?")) return;
    try {
      setDeletingId(id);
      await projectService.remove(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || "ลบไม่สำเร็จ");
    } finally {
      setDeletingId("");
    }
  };

  return (
  <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* BG image layer */}
      <div
        aria-hidden="true"
        className="
          min-h-screen absolute inset-0 z-0 pointer-events-none
        bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed
        blur-sm
        "
      />
      <div aria-hidden="true" className="min-h-screen absolute inset-0 -z-10 bg-white/70 backdrop-blur-sm" />

  <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="rounded-t-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white px-6 sm:px-8 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-medium">
                {isStudent ? 'โปรเจคของฉัน' : 'โปรเจคที่ปรึกษา'}
              </h2>

              {canCreateProject && (
                <Link
                  to="/projects/create"
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  สร้างโปรเจคใหม่
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white rounded-b-2xl shadow-xl px-6 sm:px-8 py-6">
            {/* Error bar */}
            {err && (
              <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                {err}
              </div>
            )}

            {/* Loading skeleton */}
            {loading ? (
              <>
                {isStudent ? (
                  <div className="rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden">
                    <div className="h-3 bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse" />
                    <div className="p-8 space-y-4">
                      <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
                      <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
                      <div className="grid sm:grid-cols-2 gap-4 pt-4">
                        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                        <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                      </div>
                      <div className="h-12 w-full bg-gray-200 rounded-xl animate-pulse mt-6" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-200/60 bg-white/90 shadow-sm overflow-hidden">
                          <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-300" />
                          <div className="p-6 space-y-3">
                            <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
                            <div className="h-8 w-full bg-gray-200 rounded animate-pulse mt-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : projects.length === 0 ? (
              // Empty state
              <div className="text-center py-16">
                <div className="mx-auto w-full max-w-md bg-white/95 rounded-2xl border border-gray-200/60 shadow-xl p-8">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <Users className="w-12 h-12 sm:w-14 sm:h-14 text-gray-300 mx-auto relative z-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {isStudent ? 'ยังไม่มีโปรเจค' : 'ยังไม่มีโปรเจคที่ปรึกษา'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {isStudent 
                      ? 'เริ่มต้นสร้างโปรเจคเพื่อเชื่อมกับการนัดหมายและที่ปรึกษา' 
                      : 'รอนักศึกษาเพิ่มคุณเป็นที่ปรึกษาโปรเจค'}
                  </p>
                  {canCreateProject && (
                    <Link
                      to="/projects/create"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
                    >
                      <PlusCircle className="w-5 h-5" /> สร้างโปรเจคใหม่
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                {isStudent ? (
                  // Student View - Single Prominent Project
                  <div className="space-y-6">
                    {projects.map((p) => {
                      const membersCount = Array.isArray(p?.members) ? p.members.length : 0;
                      const advisorName =
                        p?.advisor?.fullName || p?.advisor?.username || p?.advisor?.email || "—";
                      const filesCount = Array.isArray(p?.files) ? p.files.length : 0;

                      return (
                        <div
                          key={p._id}
                          className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 shadow-2xl overflow-hidden hover:shadow-3xl transition-all">
                          <div className="h-3 bg-gradient-to-r from-blue-500 to-purple-600" />
                          
                          <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex-1">
                                <h3 className="text-3xl font-bold text-gray-900 mb-3">{p.name || "(ไม่มีชื่อโปรเจค)"}</h3>
                                <div className="flex items-center text-lg text-gray-700">
                                  <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                                  <span>อาจารย์ที่ปรึกษา: <strong>{advisorName}</strong></span>
                                </div>
                              </div>
                              
                              {canDelete(p, user, role) && (
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/projects/details/${p._id}`}
                                    className="p-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-colors"
                                    title="แก้ไข"
                                  >
                                    <Pencil className="w-5 h-5 text-blue-700" />
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(p._id)}
                                    disabled={deletingId === p._id}
                                    className={`p-3 rounded-xl transition-colors ${deletingId === p._id
                                      ? "bg-red-100 text-red-400 cursor-not-allowed"
                                      : "bg-red-100 hover:bg-red-200 text-red-600"
                                      }`}
                                    title="ลบ"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                                <div className="flex items-center justify-between mb-2">
                                  <Users className="w-6 h-6 text-emerald-600" />
                                  <span className="text-2xl font-bold text-emerald-700">{membersCount}</span>
                                </div>
                                <p className="text-sm text-emerald-800 font-medium">สมาชิก</p>
                              </div>

                              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                  <Cal className="w-6 h-6 text-orange-600" />
                                  <span className="text-2xl font-bold text-orange-700">{p.academicYear || "-"}</span>
                                </div>
                                <p className="text-sm text-orange-800 font-medium">ปีการศึกษา</p>
                              </div>

                              {filesCount > 0 && (
                                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <FileText className="w-6 h-6 text-pink-600" />
                                    <span className="text-2xl font-bold text-pink-700">{filesCount}</span>
                                  </div>
                                  <p className="text-sm text-pink-800 font-medium">ไฟล์</p>
                                </div>
                              )}

                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                <div className="flex items-center justify-between mb-2">
                                  <Cal className="w-6 h-6 text-purple-600" />
                                </div>
                                <p className="text-sm text-purple-800 font-medium">สร้างเมื่อ</p>
                                <p className="text-xs text-purple-700 mt-1">{fmtDate(p.createdAt)}</p>
                              </div>
                            </div>

                            <Link
                              to="/appointments/create"
                              state={{ projectId: p._id }}
                              className="block w-full text-center px-6 py-4 text-lg rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                            >
                              นัดหมายกับโปรเจคนี้
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Advisor View - Multiple Projects Grid
                  <>
                    <div className="mb-6 text-gray-700">
                      จำนวนทั้งหมด <strong>{projects.length}</strong> โปรเจค
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {projects.map((p) => {
                        const membersCount = Array.isArray(p?.members) ? p.members.length : 0;
                        const advisorName =
                          p?.advisor?.fullName || p?.advisor?.username || p?.advisor?.email || "—";
                        const filesCount = Array.isArray(p?.files) ? p.files.length : 0;

                        return (
                          <div
                            key={p._id}
                            className="group bg-white/95 rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
                            
                            <div className="p-6">
                              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{p.name || "(ไม่มีชื่อโปรเจค)"}</h3>

                              <div className="flex items-center text-gray-700 mb-2">
                                <Users className="w-4 h-4 mr-2 text-emerald-600" />
                                <span>{membersCount} สมาชิก</span>
                              </div>

                              <div className="flex items-center text-gray-700 mb-2">
                                <Cal className="w-4 h-4 mr-2 text-orange-600" />
                                <span>ปีการศึกษา {p.academicYear || "-"}</span>
                              </div>

                              {filesCount > 0 && (
                                <div className="flex items-center text-gray-700 mb-2">
                                  <FileText className="w-4 h-4 mr-2 text-pink-600" />
                                  <span>{filesCount} ไฟล์</span>
                                </div>
                              )}

                              <div className="flex items-center text-gray-600 mb-4">
                                <Cal className="w-4 h-4 mr-2 text-purple-600" />
                                <span>สร้างเมื่อ {fmtDate(p.createdAt)}</span>
                              </div>

                              <div className="flex items-center justify-between">
                                <Link
                                  to="/appointments/create"
                                  state={{ projectId: p._id }}
                                  className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-500 hover:to-purple-500 hover:text-white transition-colors font-medium"
                                >
                                  นัดหมายกับโปรเจคนี้
                                </Link>

                                <div className="flex items-center gap-2">
                                  {canDelete(p, user, role) && (
                                    <Link
                                      to={`/projects/details/${p._id}`}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 transition-colors"
                                      title="แก้ไข"
                                    >
                                      <Pencil className="w-4 h-4 text-gray-700" />
                                    </Link>
                                  )}

                                  {canDelete(p, user, role) && (
                                    <button
                                      onClick={() => handleDelete(p._id)}
                                      disabled={deletingId === p._id}
                                      className={`p-2 rounded-lg transition-colors ${deletingId === p._id
                                        ? "bg-red-100 text-red-400 cursor-not-allowed"
                                        : "bg-gray-100 hover:bg-red-100 text-red-600"
                                        }`}
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}