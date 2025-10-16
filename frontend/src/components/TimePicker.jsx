import React from 'react';

export default function TimePicker({ value = '', onChange = () => {}, id, name, className = '', disabled = false, minuteStep = 10 }) {
  const parse = (v) => {
    if (!v) return { hh: '', mm: '' };
    const [hh = '', mm = ''] = String(v).split(':');
    return { hh: hh.padStart(2, '0'), mm: mm.padStart(2, '0') };
  };

  const { hh, mm } = parse(value);

  const handleHour = (e) => {
    const newH = e.target.value.padStart(2, '0');
    const newVal = `${newH}:${(mm || '00')}`;
    onChange(newVal);
  };

  const handleMinute = (e) => {
    const newM = e.target.value.padStart(2, '0');
    const newVal = `${(hh || '00')}:${newM}`;
    onChange(newVal);
  };

  // build minute options according to minuteStep (divides 60)
  const minutes = [];
  for (let m = 0; m < 60; m += minuteStep) minutes.push(String(m).padStart(2, '0'));

  return (
    <div className={`flex items-center space-x-2 ${className}`.trim()} id={id}>
      <label className="sr-only" htmlFor={`${name || id}-hour`}>Hour</label>
      <select
        id={`${name || id}-hour`}
        value={hh || ''}
        onChange={handleHour}
        disabled={disabled}
        className="w-20 md:w-24 px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">ชั่วโมง</option>
        {Array.from({ length: 24 }).map((_, i) => {
          const label = String(i).padStart(2, '0');
          return (
            <option key={i} value={label}>{label}:00</option>
          );
        })}
      </select>

      <label className="sr-only" htmlFor={`${name || id}-minute`}>Minute</label>
      <select
        id={`${name || id}-minute`}
        value={mm || ''}
        onChange={handleMinute}
        disabled={disabled}
        className="w-20 md:w-24 px-3 py-2 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">นาที</option>
        {minutes.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}
