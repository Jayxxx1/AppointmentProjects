import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";


export default function MainContent() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName = user?.fullName || user?.username || user?.email || "ผู้ใช้";

  const handleCreate = () => {
    navigate("/appointments"); // ไปหน้า/ฟอร์มสร้างนัดหมายของคุณ
  };

  return (
    <div className="min-h-screen bg-[url('/bg/bg.webp')]  bg-cover bg-fixed  bg-no-repeat ">
      <div className="relative z-10 backdrop-blur-sm">
        {/* subtle pattern background */}
        {/* <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <pattern id="dots-plus" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="currentColor"/>
              <path d="M10 5 L10 15 M5 10 L15 10" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots-plus)" />
        </svg>
      </div> */}

        <div className="relative z-10 px-4 py-10 sm:px-6 lg:px-8">
          {/* HERO */}
          <section className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-xl" />
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-lg" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    {/* calendar icon */}
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none">
                      <path d="M7 3v4M17 3v4M4 11h16M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="uppercase tracking-wider text-blue-100 text-sm">ระบบนัดหมายออนไลน์</p>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight">
                  สวัสดี {displayName} 👋<br />
                  พร้อมหรือยังสำหรับการนัดหมายครั้งถัดไป?
                </h1>
                <p className="mt-5 text-blue-100 text-base sm:text-lg max-w-3xl">
                  หน้านี้เป็นจุดเริ่มต้นก่อนใช้งาน — คุณสามารถสร้างนัดหมายใหม่ เลือกวันเวลา รูปแบบการพบ (ออนไลน์/ออนไซต์)
                  และเชิญผู้เกี่ยวข้องได้ในไม่กี่คลิก
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-xl font-medium shadow-xl hover:shadow-2xl transition-all"
                  >
                    {/* plus icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    เริ่มสร้างนัดหมาย
                  </button>

                  <Link
                    to="/help" // สร้างเพจ help/guide ตามโปรเจกต์จริง
                    className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-xl font-medium transition-all"
                  >
                    {/* book icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    วิธีใช้งานอย่างย่อ
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ขั้นตอนการใช้งาน */}
          <section className="max-w-6xl mx-auto mt-12">
            <div className="grid md:grid-cols-3 gap-6">
              <StepCard
                index={1}
                title="กรอกข้อมูลนัดหมาย"
                desc="ระบุหัวข้อ วันเวลา สถานที่/ลิงก์ และรายละเอียดที่จำเป็น"
                icon={
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    <path d="M9 7h6M9 12h6M9 17h3M5 21h14a2 2 0 0 0 2-2V7l-4-4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
              <StepCard
                index={2}
                title="เชิญผู้เกี่ยวข้อง"
                desc="เพิ่มผู้เข้าร่วมผ่านรายชื่อผู้ใช้หรืออีเมล และแนบหมายเหตุได้"
                icon={
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    <path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4ZM5 9c1.657 0 3-1.79 3-4S6.657 1 5 1 2 2.79 2 5s1.343 4 3 4Zm11 2c-2.21 0-4.21 1.79-4.86 4.26-.24.92.51 1.74 1.46 1.74h6.8c.95 0 1.7-.82 1.46-1.74C20.21 12.79 18.21 11 16 11ZM5 11c-2.21 0-4.21 1.79-4.86 4.26-.24.92.51 1.74 1.46 1.74H8.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
              <StepCard
                index={3}
                title="ยืนยันและส่งแจ้งเตือน"
                desc="ตรวจทานข้อมูล กดยืนยัน ระบบจะแจ้งเตือนไปยังผู้เกี่ยวข้อง"
                icon={
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                    <path d="m20 7-9 9-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />
            </div>
          </section>

          {/* จุดเด่น */}
          <section className="max-w-6xl mx-auto mt-12">
            <div className="bg-white/80 backdrop-blur-lg border border-white/60 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">ทำไมต้องใช้ระบบนัดหมายนี้?</h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-700">
                <FeatureItem
                  title="ใช้งานง่าย"
                  desc="ออกแบบให้ใช้งานได้ทันที ไม่ซับซ้อน"
                  icon={
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6v12m8-12v12M3 18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <FeatureItem
                  title="ยืดหยุ่น"
                  desc="รองรับทั้งนัดออนไลน์และออนไซต์"
                  icon={
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <FeatureItem
                  title="สื่อสารครบ"
                  desc="แนบหมายเหตุ ไฟล์ และรายชื่อผู้เข้าร่วมได้"
                  icon={
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 3V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 3h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 3 10 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <FeatureItem
                  title="ควบคุมสิทธิ์"
                  desc="ปกป้องข้อมูลด้วยระบบสิทธิ์และการยืนยันตัวตน"
                  icon={
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M12 1 3 5v6c0 5.25 3.438 10.125 9 12 5.563-1.875 9-6.75 9-12V5l-9-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg transition-all"
                >
                  สร้างนัดหมายใหม่ตอนนี้
                </button>
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  ไปหน้าจัดการนัดหมาย
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ / Tips (ไม่ผูกข้อมูล) */}
          <section className="max-w-6xl mx-auto mt-12">
            <div className="bg-white/80 backdrop-blur-lg border border-white/60 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">คำแนะนำก่อนเริ่ม</h3>
              <div className="grid sm:grid-cols-2 gap-6 text-gray-700 leading-relaxed">
                <div>
                  <p className="font-medium text-gray-900">เตรียมข้อมูลที่จำเป็น</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>หัวข้อ/วัตถุประสงค์</li>
                    <li>วันเวลาเริ่ม–สิ้นสุด</li>
                    <li>รูปแบบการนัด (ออนไลน์/ออนไซต์) และสถานที่/ลิงก์</li>
                    <li>ผู้เข้าร่วม/อีเมลที่ต้องแจ้ง</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900">หลักการรักษาความปลอดภัย</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>เห็นเฉพาะข้อมูลที่คุณมีสิทธิ์</li>
                    <li>รายละเอียดเชิงลึกเข้าถึงได้เฉพาะผู้สร้าง/ผู้เกี่ยวข้อง/แอดมิน</li>
                    <li>เปลี่ยนรหัสผ่านสม่ำเสมอ และอย่าเผยแพร่ลิงก์นัดหมายสาธารณะ</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER CTA */}
          <section className="max-w-6xl mx-auto mt-12 mb-8">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-2xl">
              <div className="mb-4 sm:mb-0">
                <h4 className="text-xl font-semibold">พร้อมแล้วใช่ไหม?</h4>
                <p className="text-blue-100 mt-1">เริ่มสร้างนัดหมายแรกของคุณในไม่กี่ขั้นตอน</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-700 font-medium hover:bg-blue-50 transition-all"
                >
                  เริ่มเลย
                </button>
                <Link
                  to="/help"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/60 text-white hover:bg-white/10 transition-all"
                >
                  ดูวิธีใช้งาน
                </Link>
              </div>
            </div>
          </section>
        </div
        >
      </div>
    </div>
  );
}

/* ----------------- Small UI bits ----------------- */

function StepCard({ index, title, desc, icon }) {
  return (
    <div className="bg-white/80 backdrop-blur-lg border border-white/60 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-semibold">
          {index}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="flex items-start gap-3 text-gray-700">
        <div className="text-gray-500">{icon}</div>
        <p className="leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function FeatureItem({ title, desc, icon }) {
  return (
    <li className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="text-blue-600">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-gray-600 text-sm mt-1">{desc}</p>
      </div>
    </li>
  );
}
