import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import Swal from 'sweetalert2';

const ReschedulePage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Display message while processing the response. Use Thai to align with the rest of the UI.
  const [message, setMessage] = useState('กำลังประมวลผลคำตอบของคุณ...');

  useEffect(() => {
    const processResponse = async () => {
      const queryParams = new URLSearchParams(location.search);
      const action = queryParams.get('action');
      // reason may come from query string (rare) but typically we will prompt
      let reason = queryParams.get('reason') || '';
      const token = queryParams.get('token') || '';
      if (!action) {
        setMessage('ลิงก์ไม่ถูกต้อง — ไม่พบการดำเนินการ');
        return;
      }
      const accepted = action === 'approve';

      try {
        if (!accepted && !reason) {
          const { value: userReason, isConfirmed } = await Swal.fire({
            title: 'ระบุเหตุผลในการปฏิเสธ',
            input: 'textarea',
            inputPlaceholder: 'กรุณาใส่เหตุผล...',
            inputAttributes: { rows: 4 },
            showCancelButton: true,
            cancelButtonText: 'ยกเลิก',
            confirmButtonText: 'ส่งคำตอบ',
          });
          if (!isConfirmed) {
            await Swal.fire({ icon: 'info', title: 'ยกเลิก', text: 'กรุณาปฏิเสธเวลาใหม่ผ่านระบบ', confirmButtonText: 'ตกลง' });
            navigate('/appointments');
            return;
          }
          reason = userReason || '';
        }

        // Build payload
        const payload = { accepted, reason };
        if (token) payload._token = token;

        await appointmentService.respondToReschedule(id, payload);

        // Show appropriate success message
        await Swal.fire({
          icon: 'success',
          title: 'ส่งคำตอบเรียบร้อย',
          text: accepted
            ? 'ขอบคุณ — คุณได้ยืนยันเวลาใหม่แล้ว ระบบจะแจ้งให้อาจารย์ทราบ'
            : reason
            ? `คุณได้ปฏิเสธเวลาใหม่ โดยระบุเหตุผล: ${reason}`
            : 'คุณได้ปฏิเสธการเลื่อนนัดเรียบร้อยแล้ว',
          timer: 3000,
          timerProgressBar: true,
          confirmButtonText: 'ตกลง',
        });
        navigate('/appointments');
      } catch (error) {
        console.error('Error responding to reschedule request:', error);
        const msg = error?.response?.data?.message || error?.message || 'ไม่สามารถส่งคำตอบของคุณได้ กรุณาลองใหม่อีกครั้ง';
        // If token was missing and user is not logged in, provide login option
        if (!token && !localStorage.getItem('token')) {
          await Swal.fire({
            icon: 'warning',
            title: 'ต้องเข้าสู่ระบบ',
            text: 'คุณยังไม่ได้เข้าสู่ระบบ หากต้องการตอบรับการเลื่อนนัด โปรดเข้าสู่ระบบก่อน หรือใช้ลิงก์ในอีเมลอีกครั้ง',
            confirmButtonText: 'ไปที่หน้าเข้าสู่ระบบ',
          });
          navigate('/login');
          return;
        }
        await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg, confirmButtonText: 'ตกลง' });
        navigate('/appointments');
      }
    };
    processResponse();
  }, [id, location, navigate]);

  return (
    <div className="bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-lg rounded-xl shadow-xl p-6 md:p-10 max-w-xl w-full text-center space-y-4 border border-gray-200/70">
        <h1 className="text-2xl font-bold text-gray-800">{message}</h1>
        <p className="text-gray-600">ระบบจะพาคุณไปยังหน้าการนัดหมายโดยอัตโนมัติ</p>
      </div>
    </div>
  );
};

export default ReschedulePage;
