import React from "react";

export default function MeetSumPage() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-[url(./bg/bg.webp)] bg-cover bg-center bg-no-repeat bg-fixed blur-sm"></div>
        <div className="relative z-10 min-h-screen p-4 md:p-6 lg:p-8 flex flex-col items-center">
          <h1 className="text-xl font-bold mb-2">สรุปการประชุม/นัดหมาย</h1>
          <p>จะมีรายละเอียดแต่ละการประชุมที่เกี่ยวข้องกับคุณ</p>
        </div>
      </div>

  );
}
