// import React from "react";
// import { useState, useEffect } from 'react';
// import { Link } from "react-router-dom";
// import { useAuth } from '../contexts/AuthContext';
// import { IoMdInformationCircleOutline } from "react-icons/io";


// import { Calendar, Clock, Users, Bell, ShieldCheck } from "lucide-react";

// export default function LandingPage() {
//   const { isAuthenticated, logout, user } = useAuth();
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-white to-sky-50 text-slate-800">
//       <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
//         <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="h-9 w-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">A</div>
//             <span className="font-semibold">Appointment & Meeting</span>
//           </div>
//           {!isAuthenticated ? (
//             <div className="flex items-center gap-3">
//               <Link to="/login" className="px-4 py-2 rounded-xl border hover:bg-slate-50">เข้าสู่ระบบ</Link>
//               <Link to="/register" className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700">สมัครใช้งานฟรี</Link>
//             </div>
//           ) : (
//             <div className="flex items-center space-x-2">
//               {/* <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
//                     {user?.username?.charAt(0)?.toUpperCase() || 'U'}
//                   </div> */}

//               <div className="text-gray-700">
//                 <span className="text-sm text-gray-500">สวัสดี,</span>
//                 <br />
//                 <strong className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//                   {user?.username}
//                 </strong>
//               </div>

//             </div>
//           )}
//         </div>
//       </header>

//       <section className="relative overflow-hidden">
//         <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 grid md:grid-cols-2 gap-10 items-center">
//           <div>
//             <h1 className="text-4xl md:text-5xl font-bold leading-tight">
//               จัดการนัดหมาย–การประชุม <span className="text-sky-700">ง่าย ครบ จบในที่เดียว</span>
//             </h1>
//             <p className="mt-4 text-lg text-slate-600">
//               จองนัด ส่งอนุมัติ แจ้งเตือนอัตโนมัติ และติดตามสรุปการประชุม สำหรับนักศึกษา–อาจารย์–แอดมิน
//             </p>
//             {!isAuthenticated ? (
//               <div className="mt-8 flex flex-wrap gap-3">
//                 <Link to="/register" className="px-6 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700">เริ่มใช้งานฟรี</Link>
//                 <Link to="/login" className="px-6 py-3 rounded-xl border hover:bg-slate-50">มีบัญชีแล้ว? เข้าสู่ระบบ</Link>
//                 <Link to="/about" className="px-6 py-3 rounded-xl border hover:bg-slate-50 flex items-center justify-center">
//                   <IoMdInformationCircleOutline className="mr-2 text-xl" />
//                   <span>เกี่ยวกับ</span>
//                 </Link>
//               </div>
//             ) : (
//               <div className="mt-8">
//                 <Link to="/appointments" className="px-6 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700">สร้างนัดหมายของคุณ</Link>
//                 <Link to="/about" className="px-6 py-3 rounded-xl border hover:bg-slate-50 flex items-center justify-center">
//                   <IoMdInformationCircleOutline className="mr-2 text-xl" />
//                   <span>เกี่ยวกับ</span>
//                 </Link>
//               </div>

//             )}
//             <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
//               <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> JWT Secured</div>
//               <div className="flex items-center gap-2"><Bell className="w-4 h-4" /> Email แจ้งเตือน</div>
//             </div>
//           </div>
//           <div className="relative">
//             <div className="absolute inset-0 -z-10 bg-sky-200/40 blur-3xl rounded-full translate-y-10"></div>
//             <div className="rounded-2xl border bg-white shadow-sm p-4">
//               <div className="rounded-xl border bg-slate-50 p-4 mb-4">
//                 <div className="flex items-center gap-3">
//                   <div className="h-10 w-10 rounded-lg bg-sky-600 text-white flex items-center justify-center">📅</div>
//                   <div>
//                     <div className="font-semibold">ตัวอย่างนัดหมายที่รออนุมัติ</div>
//                     <div className="text-sm text-slate-500">ดูสถานะได้แบบเรียลไทม์</div>
//                   </div>
//                 </div>
//               </div>
//               <div className="grid grid-cols-3 gap-3">
//                 <div className="rounded-lg border bg-white p-3">
//                   <Calendar className="w-5 h-5" />
//                   <div className="mt-2 text-sm text-slate-600">จองนัดออนไลน์</div>
//                 </div>
//                 <div className="rounded-lg border bg-white p-3">
//                   <Clock className="w-5 h-5" />
//                   <div className="mt-2 text-sm text-slate-600">จัดตารางฉลาด</div>
//                 </div>
//                 <div className="rounded-lg border bg-white p-3">
//                   <Users className="w-5 h-5" />
//                   <div className="mt-2 text-sm text-slate-600">กลุ่มโปรเจกต์</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       <section id="features" className="py-16 bg-white">
//         <div className="mx-auto max-w-7xl px-4">
//           <h2 className="text-2xl md:text-3xl font-bold">ฟีเจอร์เด่น</h2>
//           <div className="mt-8 grid md:grid-cols-3 gap-6">
//             {[
//               { title: "จองนัดหมายออนไลน์", desc: "เลือกวัน–เวลา ส่งให้อาจารย์อนุมัติได้ทันที", icon: <Calendar className="w-5 h-5" /> },
//               { title: "แจ้งเตือนอัตโนมัติ", desc: "อีเมลและสถานะในระบบ ลดการลืม", icon: <Bell className="w-5 h-5" /> },
//               { title: "ติดตามสถานะ", desc: "pending / approved / reschedule ครบ", icon: <Clock className="w-5 h-5" /> },
//             ].map((f, i) => (
//               <div key={i} className="rounded-2xl border p-6 hover:shadow-sm transition">
//                 <div className="h-10 w-10 rounded-lg bg-sky-600/10 text-sky-700 flex items-center justify-center">{f.icon}</div>
//                 <div className="mt-4 font-semibold">{f.title}</div>
//                 <div className="text-slate-600 text-sm mt-1">{f.desc}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       <footer className="py-10 border-t bg-white">
//         <div className="mx-auto max-w-7xl px-4 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3">
//           <div>© {new Date().getFullYear()} Appointment & Meeting</div>
//           <div className="flex gap-4">
//             <a href="#" className="hover:text-sky-700">Privacy</a>
//             <a href="#" className="hover:text-sky-700">Terms</a>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }