import React from 'react';
import ModalPortal from './ModalPortal';
import { AiOutlineClose } from 'react-icons/ai';

const NextAppointmentInfoModal = ({ isOpen, onClose, previousAppointment, meetingSummary }) => {
  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 md:p-8 m-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><AiOutlineClose size={24} /></button>
          <h2 className="text-2xl font-bold mb-4">ข้อมูลนัดหมายที่เกี่ยวข้อง</h2>

          <div className="space-y-4">
            {previousAppointment ? (
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold">นัดหมายก่อนหน้า</h3>
                <p className="text-sm text-gray-700">{previousAppointment.title}</p>
                <p className="text-sm text-gray-500">วันที่ {previousAppointment.date} {previousAppointment.startTime} - {previousAppointment.endTime}</p>
              </div>
            ) : <div className="text-sm text-gray-500">ไม่มีข้อมูลนัดหมายก่อนหน้า</div>}

            {meetingSummary ? (
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold">สรุปการประชุมที่เกี่ยวข้อง</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meetingSummary.summary}</p>
                {meetingSummary.homework && <p className="text-sm text-gray-700 mt-2"><strong>งานที่มอบหมาย:</strong> {meetingSummary.homework}</p>}
              </div>
            ) : <div className="text-sm text-gray-500">ไม่มีสรุปที่เชื่อมโยง</div>}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default NextAppointmentInfoModal;
