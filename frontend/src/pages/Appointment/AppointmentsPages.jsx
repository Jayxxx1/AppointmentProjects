import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAppointments } from "../../services/appointmentService";
import { Link } from "react-router-dom";
                import { MdHistory } from "react-icons/md";

import {
  AiFillPlusCircle,
  AiFillCalendar,
  AiFillClockCircle,
} from "react-icons/ai";
import { MdLocationOn, MdPerson } from "react-icons/md";
import {
  IoMdCheckmarkCircleOutline,
  IoMdCloseCircleOutline,
  IoMdTime,
} from "react-icons/io";

export default function AppointmentsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false); // state สำหรับสลับแสดงประวัติ

  useEffect(() => {
    // ไม้มี token ไม่โหลดจ้า
    if (!token) {
      setLoading(false);
      return;
    }
    // ถ้า showHistory=true จะส่งพารามิเตอร์ history ไปยัง API
    const params = showHistory ? { history: true } : {};
    getAppointments(params)
      .then((data) =>
        setAppointments(
          Array.isArray(data) ? data : data?.items || []
        )
      )
      .catch((err) => {
        console.error(
          "Load appointments error:",
          err?.response?.data || err?.message
        );
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [token, showHistory]);

  // ฟังก์ชันช่วยแสดงไอคอนสถานะ
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "approved":
        return (
          <IoMdCheckmarkCircleOutline className="text-green-500 text-xl" />
        );
      case "completed":
        return (
          <IoMdCheckmarkCircleOutline className="text-sky-500 text-xl" />
        );
      case "cancelled":
      case "rejected":
        return (
          <IoMdCloseCircleOutline className="text-red-500 text-xl" />
        );
      case "pending":
      default:
        return <IoMdTime className="text-yellow-500 text-xl" />;
    }
  };

  // ฟังก์ชันช่วยกำหนดสีแถบด้านบนของการ์ดตามสถานะ
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "confirmed":
      case "approved":
        return "from-green-500 to-emerald-500";
      case "completed":
        return "from-sky-500 to-indigo-500";
      case "cancelled":
      case "rejected":
        return "from-red-500 to-pink-500";
      case "pending":
      default:
        return "from-yellow-500 to-amber-500";
    }
  };

  // ฟังก์ชันแปลข้อความสถานะเป็นภาษาไทย
  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "ยืนยันแล้ว";
      case "approved":
        return "อนุมัติแล้ว";
      case "completed":
        return "เสร็จสิ้นการประชุม";
      case "cancelled":
        return "ยกเลิกแล้ว";
      case "rejected":
        return "ปฏิเสธแล้ว";
      case "pending":
        return "รอการยืนยัน";
      case "reschedule_requested":
        return "ขอเลื่อนนัด";
      default:
        return status;
    }
  };

  if (loading) {
    // แสดงหน้ากำลังโหลด
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat backdrop-blur-xl"></div>
        <div className="relative z-10 p-8">
          <div className="bg-white/95 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gradient-to-r from-blue-500 to-purple-500"></div>
              <span className="text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                กำลังโหลด...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" min-h-full">
      <div className="absolute inset-0 bg-[url('./bg/bg.webp')] bg-cover bg-center bg-no-repeat bg-fixed blur-sm"></div>
      <div className="relative z-10 min-h-full p-4 md:p-6 lg:p-8 flex flex-col items-center">
        {/* หากไม่มีนัดหมายเลย */}
        {appointments.length === 0 ? (
          <div className="text-center w-full mt-20">
            <div className="bg-white/95 rounded-3xl shadow-2xl p-12 max-w-md mx-auto transform hover:scale-105 transition-all duration-300">
              <div className="relative mb-8 flex justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-red-300 rounded-full blur-2xl opacity-80 animate-pulse"></div>
                <AiFillCalendar className="text-white rounded-2xl w-20 h-20 sm:w-24 sm:h-24 text-6xl sm:text-8xl text-gray-300 mx-auto relative z-10 animate-bounce" />
              </div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                คุณยังไม่มีนัดหมาย
              </h1>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                เริ่มต้นสร้างนัดหมายใหม่เพื่อจัดการตารางเวลาของคุณ
              </p>
              {/* ปุ่มสร้างนัดหมายใหม่ */}
              <Link
                to="/appointments/create"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 hover:shadow-blue-500/25"
              >
                <AiFillPlusCircle className="text-xl mr-3 group-hover:rotate-90 transition-transform duration-300" />
                <span>สร้างนัดหมายใหม่</span>
              </Link>
              <div className="mt-6">
              <button
                onClick={() => setShowHistory(prev => !prev)}
              >
                <MdHistory className="text-gray-500 mr-2 w-10 h-10 cursor-pointer duration-300 transform hover:scale-110" />
              </button>
            </div>
          </div>
        </div>
        
        ) : (
          // หากมีนัดหมาย
          <div className="max-w-6xl w-full mx-auto px-2 sm:px-4">
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 mb-8 border border-gray-200/50">
              <div className="flex items-center justify-between">
                {/* หัวข้อ */}
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    <img
                      src="./logo/logo2.png"
                      alt="Logo"
                      className="w-16 h-12 relative z-10 drop-shadow-lg"
                    />
                  </div>
                  <div className="ml-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                      นัดหมายของคุณ
                    </h1>
                    <p className="text-gray-600 mt-1">
                      จำนวนทั้งหมด {appointments.length} นัดหมาย
                    </p>
                  </div>
                </div>
                {/* ปุ่มสร้างนัดใหม่และปุ่มประวัติ */}
                <div className="flex items-center gap-3">
                  {/* ปุ่มสร้างนัดหมายใหม่ */}
                  <Link
                    to="/appointments/create"
                    className="group flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-green-500/25"
                  >
                    <AiFillPlusCircle className="text-xl mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="hidden sm:inline">
                      สร้างนัดหมายใหม่
                    </span>
                  </Link>
                  {/* ปุ่มประวัติ: สลับ showHistory */}
                  <button
                    onClick={() => {
                      setShowHistory((prev) => !prev);
                    }}
                    className={`inline-flex items-center px-4 py-2 rounded-xl border font-medium ${showHistory
                        ? "bg-gray-100 text-gray-800"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                  >

                    ประวัติ
                  </button>
                </div>
              </div>
            </div>

            {/* ตารางนัดหมาย */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appointment, index) => (
                <div
                  key={appointment._id}
                  className="group bg-white/95 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-200/50 overflow-hidden transform hover:scale-105 transition-all duration-300 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* แถบสีแสดงสถานะด้านบนการ์ด */}
                  <div
                    className={`h-2 bg-gradient-to-r ${getStatusColor(
                      appointment.status
                    )}`}
                  ></div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                      {appointment.title}
                    </h3>
                    {/* แสดงวันที่และเวลา */}
                    <div className="flex items-center mb-3 text-gray-600">
                      <AiFillCalendar className="text-blue-500 mr-2" />
                      <span className="font-medium">{appointment.date}</span>
                    </div>
                    <div className="flex items-center mb-3 text-gray-600">
                      <AiFillClockCircle className="text-purple-500 mr-2" />
                      <span>เวลา {appointment.startTime}</span>
                      {appointment.endTime && (
                        <span> - {appointment.endTime}</span>
                      )}
                    </div>
                    {/* แสดงสถานที่ถ้ามี */}
                    {appointment.location && (
                      <div className="flex items-center mb-3 text-gray-600">
                        <MdLocationOn className="text-green-500 mr-2" />
                        <span className="truncate">{appointment.location}</span>
                      </div>
                    )}
                    {/* แสดงจำนวนผู้เข้าร่วม */}
                    {appointment.participants &&
                      appointment.participants.length > 0 && (
                        <div className="flex items-center mb-4 text-gray-600">
                          <MdPerson className="text-orange-500 mr-2" />
                          <span>
                            {appointment.participants.length} ผู้เข้าร่วม
                          </span>
                        </div>
                      )}
                    {/* แสดงสถานะและปุ่มดูรายละเอียด */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(appointment.status)}
                        <span className="ml-2 font-medium text-gray-700">
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      <Link
                        to={`/appointments/${appointment._id}`}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-500 hover:to-purple-500 hover:text-white rounded-lg transition-all duration-300 font-medium"
                      >
                        รายละเอียด
                      </Link>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
