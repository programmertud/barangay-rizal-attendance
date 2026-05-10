import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AttendanceRecord, Official } from '../types/official';
import Card from '../components/Card';

const Reports: React.FC = () => {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const officialsSnapshot = await getDocs(collection(db, 'officials'));
      const officialsData = officialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Official));
      setOfficials(officialsData);

      const recordsSnapshot = await getDocs(collection(db, 'attendance'));
      const recordsData = recordsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAllRecords(recordsData);
    };
    fetchData();
  }, []);

  const getMonthRange = (yyyyMm: string) => {
    if (!yyyyMm) return { start: '', end: '' };
    const [y, m] = yyyyMm.split('-').map((v) => Number(v));
    if (!y || !m) return { start: '', end: '' };
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const toStr = (d: Date) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };
    return { start: toStr(start), end: toStr(end) };
  };

  const exportCsv = (rows: any[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    if (!startDate || !endDate) return [];

    const filteredRecords = allRecords.filter(record => {
      return record.date >= startDate && record.date <= endDate;
    });

    const report = officials.map(official => {
      const officialRecords = filteredRecords.filter(r => r.officialId === official.id);
      const presentDays = officialRecords.filter(r => r.status === 'present').length;
      const lateDays = officialRecords.filter(r => r.status === 'late').length;

      const amPresent = officialRecords.filter((r) => Boolean(r.checkIn1 || r.checkIn)).length;
      const amOut = officialRecords.filter((r) => Boolean(r.checkOut1 || r.checkOut)).length;
      const pmPresent = officialRecords.filter((r) => Boolean(r.checkIn2)).length;
      const pmOut = officialRecords.filter((r) => Boolean(r.checkOut2)).length;

      const totalDays = new Date(endDate).getTime() - new Date(startDate).getTime();
      const totalDaysCount = Math.ceil(totalDays / (1000 * 60 * 60 * 24)) + 1;

      const daysWithAnyRecord = new Set(officialRecords.map((r) => r.date)).size;
      const absentDays = Math.max(0, totalDaysCount - daysWithAnyRecord);

      return {
        official: official.name,
        present: presentDays,
        absent: absentDays,
        late: lateDays,
        amIn: amPresent,
        amOut,
        pmIn: pmPresent,
        pmOut,
        attendanceRate: totalDaysCount > 0 ? ((presentDays / totalDaysCount) * 100).toFixed(1) : '0'
      };
    });

    return report;
  };

  const reportData = generateReport();

  const monthRange = getMonthRange(month);
  const monthReportData = (() => {
    if (!monthRange.start || !monthRange.end) return [];
    const oldStart = startDate;
    const oldEnd = endDate;
    try {
      const filtered = allRecords.filter((r) => r.date >= monthRange.start && r.date <= monthRange.end);
      return officials
        .map((official) => {
          const officialRecords = filtered.filter((r) => r.officialId === official.id);
          const daysWithAnyRecord = new Set(officialRecords.map((r) => r.date)).size;
          const totalDays = new Date(monthRange.end).getTime() - new Date(monthRange.start).getTime();
          const totalDaysCount = Math.ceil(totalDays / (1000 * 60 * 60 * 24)) + 1;
          const absentDays = Math.max(0, totalDaysCount - daysWithAnyRecord);
          return {
            official: official.name,
            present: officialRecords.filter((r) => r.status === 'present').length,
            late: officialRecords.filter((r) => r.status === 'late').length,
            absent: absentDays,
            amIn: officialRecords.filter((r) => Boolean(r.checkIn1 || r.checkIn)).length,
            amOut: officialRecords.filter((r) => Boolean(r.checkOut1 || r.checkOut)).length,
            pmIn: officialRecords.filter((r) => Boolean(r.checkIn2)).length,
            pmOut: officialRecords.filter((r) => Boolean(r.checkOut2)).length,
          };
        })
        .sort((a, b) => String(a.official).localeCompare(String(b.official)));
    } finally {
      void oldStart;
      void oldEnd;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Attendance Reports</h1>
          <p className="text-sm text-[var(--muted)]">Generate and view attendance reports</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
            Print
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const rows = reportData.length ? reportData : monthReportData;
              const name = reportData.length ? `attendance_${startDate}_${endDate}.csv` : `attendance_${month || 'report'}.csv`;
              exportCsv(rows, name);
            }}
            disabled={reportData.length === 0 && monthReportData.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      <Card title="Report Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="ui-label mb-2">Month (Quick)</label>
            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                const r = getMonthRange(e.target.value);
                setStartDate(r.start);
                setEndDate(r.end);
              }}
              className="ui-input"
            />
          </div>
          <div>
            <label className="ui-label mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ui-input"
            />
          </div>
          <div>
            <label className="ui-label mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ui-input"
            />
          </div>
        </div>
      </Card>

      {reportData.length > 0 && (
        <Card title="Attendance Summary">
          <div className="w-full">
            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
              {reportData.map((row, index) => (
                <div key={index} className="bg-[rgba(255,255,255,0.03)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
                  <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                    <p className="font-semibold text-[var(--text)] text-lg">{row.official}</p>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-[var(--muted)] font-bold">Rate</p>
                      <p className="font-bold text-[var(--accent)] text-lg">{row.attendanceRate}%</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--chip-success-bg)] text-[var(--chip-success-text)] rounded-lg p-2">
                      <p className="text-[10px] uppercase font-bold mb-1 opacity-80">Present</p>
                      <p className="font-bold text-lg leading-none">{row.present}</p>
                    </div>
                    <div className="bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)] rounded-lg p-2">
                      <p className="text-[10px] uppercase font-bold mb-1 opacity-80">Late</p>
                      <p className="font-bold text-lg leading-none">{row.late}</p>
                    </div>
                    <div className="bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)] rounded-lg p-2">
                      <p className="text-[10px] uppercase font-bold mb-1 opacity-80">Absent</p>
                      <p className="font-bold text-lg leading-none">{row.absent}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-[var(--surface-2)] rounded-xl p-3">
                      <p className="text-[10px] uppercase text-[var(--muted)] font-bold mb-2 text-center border-b border-[var(--border)] pb-1">Morning (AM)</p>
                      <div className="flex justify-between px-2">
                        <div className="text-center">
                          <p className="text-[10px] text-[var(--muted)]">In</p>
                          <p className="font-semibold text-[var(--text)]">{row.amIn}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[var(--muted)]">Out</p>
                          <p className="font-semibold text-[var(--text)]">{row.amOut}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--surface-2)] rounded-xl p-3">
                      <p className="text-[10px] uppercase text-[var(--muted)] font-bold mb-2 text-center border-b border-[var(--border)] pb-1">Afternoon (PM)</p>
                      <div className="flex justify-between px-2">
                        <div className="text-center">
                          <p className="text-[10px] text-[var(--muted)]">In</p>
                          <p className="font-semibold text-[var(--text)]">{row.pmIn}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-[var(--muted)]">Out</p>
                          <p className="font-semibold text-[var(--text)]">{row.pmOut}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Official</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Present</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Absent</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Late</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">AM In</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">AM Out</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">PM In</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">PM Out</th>
                    <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-4 px-4 text-[var(--text)] font-medium">{row.official}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.present}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.absent}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.late}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.amIn}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.amOut}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.pmIn}</td>
                      <td className="py-4 px-4 text-[var(--muted)]">{row.pmOut}</td>
                      <td className="py-4 px-4 text-[var(--text)] font-semibold">{row.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;