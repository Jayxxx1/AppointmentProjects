import React, { useMemo } from 'react';

export default function UserChart({ users = [], days = 90 }) {
  const series = useMemo(() => {
    const toDayKey = (d) => {
      const dt = new Date(d);
      if (isNaN(dt)) return null;
      return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    };

    const now = new Date();
    const keys = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() - i);
      keys.push(toDayKey(d));
    }

    const counts = Object.fromEntries(keys.map(k => [k, 0]));
    for (const u of users) {
      const k = toDayKey(u.createdAt || u.created_at || u.created || u.createdAt);
      if (k && k in counts) counts[k]++;
    }

    const daily = keys.map(k => ({ day: k, count: counts[k] || 0 }));
    let cum = 0;
    const cumulative = daily.map(d => { cum += d.count; return { day: d.day, value: cum }; });
    return { daily, cumulative };
  }, [users, days]);

  const width = 1690;
  const height = 280;
  const padding = { top: 12, right: 24, bottom: 40, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xs = series.daily.map((_, i) => padding.left + (i / Math.max(1, series.daily.length - 1)) * innerW);

  const maxY1 = Math.max(...series.daily.map(d => d.count), 1);
  const maxY2 = Math.max(...series.cumulative.map(d => d.value), 1);
  const maxY = Math.max(maxY1, maxY2);

  const yFor = (v) => padding.top + innerH - (v / maxY) * innerH;

  const pathFor = (arr, accessor) => arr.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${yFor(accessor(d)).toFixed(2)}`).join(' ');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-lg font-medium text-gray-900">กราฟผู้ใช้ (ผู้สมัครใหม่ต่อวัน และสะสม)</h3>
        <div className="text-sm text-gray-500">เส้นสีน้ำเงิน = ผู้สมัครใหม่ต่อวัน · เส้นสีเขียว = ผู้ใช้สะสม</div>
      </div>
      <div className="overflow-x-auto">
        <svg className="w-full h-56 sm:h-72" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {[0,0.25,0.5,0.75,1].map((t, idx) => {
            const y = padding.top + innerH * t;
            return <line key={idx} x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />;
          })}

          <path d={pathFor(series.daily, d => d.count)} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathFor(series.cumulative, d => d.value)} fill="none" stroke="#16A34A" strokeWidth={2} strokeDasharray="6 4" />

          {series.daily.map((d, i) => {
            const show = (i % Math.ceil(series.daily.length / 10)) === 0 || i === series.daily.length - 1;
            return show ? (
              <text key={d.day} x={xs[i]} y={height - 8} fontSize={11} textAnchor="middle" fill="#374151">{d.day.slice(5)}</text>
            ) : null;
          })}

          {[0,0.25,0.5,0.75,1].map((t, idx) => {
            const v = Math.round((1 - t) * maxY);
            const y = padding.top + innerH * t;
            return <text key={idx} x={8} y={y + 4} fontSize={11} fill="#6B7280">{v}</text>;
          })}
        </svg>
      </div>
      <div className="mt-3 flex gap-4 items-center text-sm px-2">
        <div className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block" />
          <span className="text-gray-600">ผู้สมัครใหม่ต่อวัน</span>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-green-600 rounded-sm inline-block" />
          <span className="text-gray-600">ผู้ใช้สะสม</span>
        </div>
      </div>
    </div>
  );
}
