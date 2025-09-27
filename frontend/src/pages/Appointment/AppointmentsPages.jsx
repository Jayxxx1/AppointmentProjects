import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getAppointments } from "../../services/appointmentService";
import { Link } from "react-router-dom";
import { AiFillPlusCircle, AiFillCalendar, AiFillClockCircle } from "react-icons/ai";
import { MdLocationOn, MdPerson } from "react-icons/md";
import { IoMdCheckmarkCircleOutline, IoMdCloseCircleOutline, IoMdTime } from "react-icons/io";

export default function AppointmentsPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getAppointments({})
      .then((data) => setAppointments(Array.isArray(data) ? data : (data?.items || [])))
      .catch((err) => {
        console.error("Load appointments error:", err?.response?.data || err?.message);
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'approved':
        return <IoMdCheckmarkCircleOutline className="text-green-500 text-xl" />;
      case 'cancelled':
      case 'rejected':
        return <IoMdCloseCircleOutline className="text-red-500 text-xl" />;
      case 'pending':
      default:
        return <IoMdTime className="text-yellow-500 text-xl" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'approved':
        return 'from-green-500 to-emerald-500';
      case 'cancelled':
      case 'rejected':
        return 'from-red-500 to-pink-500';
      case 'pending':
      default:
        return 'from-yellow-500 to-amber-500';
    }
  };

  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'ยืนยันแล้ว';
      case 'approved':
        return 'อนุมัติแล้ว';
      case 'cancelled':
        return 'ยกเลิกแล้ว';
      case 'rejected':
        return 'ปฏิเสธแล้ว';
      case 'pending':
        return 'รอการยืนยัน';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('/bg/bg.webp')] bg-cover bg-center bg-no-repeat backdrop-blur-xl"></div>

        {/* div สำหรับเนื้อหาที่อยู่บนภาพเบลอ */}
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
    <div className="relative min-h-screen">
      {/* div สำหรับภาพพื้นหลังที่เบลอ */}
      <div className="absolute inset-0 bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat bg-fixed blur-sm"></div>

      {/* div สำหรับเนื้อหาที่อยู่บนภาพเบลอ */}
      <div className="relative z-10 min-h-screen p-4 md:p-6 lg:p-8 flex flex-col items-center">
        {appointments.length === 0 ? (
          // No appointments - Enhanced empty state
          <div className="text-center w-full mt-20"> {/* ใช้ mt-20 เพื่อขยับ card ลงมาเล็กน้อย */}
            <div className="bg-white/95 rounded-3xl shadow-2xl p-12 max-w-md mx-auto transform hover:scale-105 transition-all duration-300">
              {/* Animated Icon */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-red-300 rounded-full blur-2xl opacity-100 animate-pulse"></div>
                <AiFillCalendar className="text-white rounded-2xl w-21 h-21 text-8xl text-gray-300 mx-auto relative z-10 animate-bounce" />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                คุณยังไม่มีนัดหมาย
              </h1>

              {/* Subtitle */}
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                เริ่มต้นสร้างนัดหมายใหม่เพื่อจัดการตารางเวลาของคุณ
              </p>

              {/* CTA Button */}
              <Link
                to="/appointments/create"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 hover:shadow-blue-500/25"
              >
                <AiFillPlusCircle className="text-xl mr-3 group-hover:rotate-90 transition-transform duration-300" />
                <span>คลิกที่นี่เพื่อสร้างนัดหมายใหม่</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-2xl"></div>
              </Link>
            </div>
          </div>
        ) : (
          // Has appointments - Enhanced list view
          <div className="max-w-6xl w-full mx-auto">
            {/* Header */}
            <div className="bg-white/95 rounded-2xl shadow-xl p-6 mb-8 border border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    <AiFillCalendar className="text-4xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent relative z-10" />
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

                {/* New Appointment Button */}
                <Link
                  to="/appointments/create"
                  className="group flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-green-500/25"
                >
                  <AiFillPlusCircle className="text-xl mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="hidden sm:inline">สร้างนัดหมายใหม่</span>
                </Link>
              </div>
            </div>

            {/* Appointments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appointment, index) => (
                <div
                  key={appointment._id}
                  className="group bg-white/95 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-200/50 overflow-hidden transform hover:scale-105 transition-all duration-300 hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Status Badge */}
                  <div className={`h-2 bg-gradient-to-r ${getStatusColor(appointment.status)}`}></div>

                  <div className="p-6">
                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                      {appointment.title}
                    </h3>

                    {/* Date and Time */}
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

                    {/* Location (if available) */}
                    {appointment.location && (
                      <div className="flex items-center mb-3 text-gray-600">
                        <MdLocationOn className="text-green-500 mr-2" />
                        <span className="truncate">{appointment.location}</span>
                      </div>
                    )}

                    {/* Participants (if available) */}
                    {appointment.participants && appointment.participants.length > 0 && (
                      <div className="flex items-center mb-4 text-gray-600">
                        <MdPerson className="text-orange-500 mr-2" />
                        <span>{appointment.participants.length} ผู้เข้าร่วม</span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(appointment.status)}
                        <span className="ml-2 font-medium text-gray-700">
                          {getStatusText(appointment.status)}
                        </span>
                      </div>

                      {/* Action Button */}
                      <button className="px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-500 hover:to-purple-500 hover:text-white rounded-lg transition-all duration-300 font-medium">
                        <Link
                          to={`/appointments/${appointment._id}`}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-blue-500 hover:to-purple-500 hover:text-white rounded-lg transition-all duration-300 font-medium"
                        >
                          รายละเอียด
                        </Link>                    </button>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}