import React from 'react';
import { Link } from 'react-router-dom';

export default function HowToUse() {
  return (
    <div className="min-h-full bg-[url('/bg/bg.webp')] bg-cover bg-fixed bg-no-repeat py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 sm:p-10 shadow-xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">วิธีใช้งาน </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">คำอธิบายสั้นๆ เพื่อให้เริ่มใช้งานได้ทันที — อ่านหนึ่งครั้งแล้วเริ่มได้เลย</p>
        </header>

        <ol className="space-y-4 list-decimal list-inside text-gray-800 text-sm sm:text-base">
          <li>
            <strong>สร้างโปรไฟล์</strong> — ไปที่หน้าโปรไฟล์และตรวจสอบชื่อ-นามสกุลกับอีเมลของคุณ เพื่อให้ผู้อื่นเห็นข้อมูลที่ถูกต้อง
          </li>
          <li>
            <strong>สร้างนัดหมายใหม่</strong> — คลิก "สร้างนัดหมาย" ระบุหัวข้อ วันเวลา และรูปแบบ (ออนไลน์/ออนไซต์)
          </li>
          <li>
            <strong>เพิ่มผู้เข้าร่วม</strong> — ใส่อีเมลหรือเลือกผู้ใช้จากรายชื่อ เพื่อให้ระบบส่งแจ้งเตือนให้ผู้เกี่ยวข้อง
          </li>
          <li>
            <strong>แนบเอกสารหรือหมายเหตุ</strong> — ใช้ฟีเจอร์แนบไฟล์เพื่อส่งเอกสารประกอบนัดหมาย (ถ้าต้องการ)
          </li>
          <li>
            <strong>ยืนยันและจัดการ</strong> — ตรวจสอบรายละเอียดแล้วกดยืนยัน ระบบจะส่งอีเมล/การแจ้งเตือนให้ผู้เข้าร่วม
          </li>
        </ol>

        <section className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm sm:text-base">
          <h3 className="font-semibold text-gray-900">เคล็ดลับสั้น ๆ</h3>
          <ul className="mt-2 list-disc pl-5 text-gray-700">
            <li>ตั้งเวลาสิ้นสุดที่ชัดเจนเพื่อลดความสับสน</li>
            <li>ใช้ช่องรายละเอียดเพื่อบอกวัตถุประสงค์ให้ชัดเจน</li>
            <li>หากเป็นการประชุมออนไลน์ ให้ใส่ลิงก์และทดสอบก่อนเวลา</li>
          </ul>
        </section>

        <div className="mt-6 flex flex-col sm:flex-row items-center sm:justify-between gap-3">
          <div className="flex gap-3 w-full sm:w-auto">
            <Link to="/appointments/create" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500">
              สร้างนัดหมายใหม่
            </Link>
            <Link to="/appointments" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
              จัดการนัดหมายของฉัน
            </Link>
          </div>
          <Link to="/" className="text-sm text-gray-600 hover:underline">กลับไปหน้าหลัก</Link>
        </div>
      </div>
    </div>
  );
}
