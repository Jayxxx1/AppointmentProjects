import React from 'react';

export default function LoadingOverlay({ show, message }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 shadow-lg flex items-center space-x-4 max-w-md">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent border-blue-500"></div>
        <div>
          <div className="font-medium text-gray-800">{message || 'กำลังดำเนินการ...'}</div>
          <div className="text-sm text-gray-500">โปรดรอสักครู่</div>
        </div>
      </div>
    </div>
  );
}
