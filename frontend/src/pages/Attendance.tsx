import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AttendanceRecord, Official } from '../types/official';
import Card from '../components/Card';

const localDateYYYYMMDD = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Attendance: React.FC = () => {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(localDateYYYYMMDD());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'pending'>('all');
  const [session, setSession] = useState<'morning' | 'afternoon'>('morning');

  const formatTime = (value?: Date | { toDate: () => Date }) => {
    if (!value) return '-';
    const date = (value as any)?.toDate ? (value as any).toDate() : (value as Date);
    return date instanceof Date ? date.toLocaleTimeString() : '-';
  };

  const getSessionCheckIn = (record?: AttendanceRecord) => {
    if (!record) return undefined;
    if (session === 'afternoon') return record.checkIn2;
    return record.checkIn1 ?? record.checkIn;
  };

  const getSessionCheckOut = (record?: AttendanceRecord) => {
    if (!record) return undefined;
    if (session === 'afternoon') return record.checkOut2;
    return record.checkOut1 ?? record.checkOut;
  };

  const isSessionWindowFinished = (dateYYYYMMDD: string) => {
    const todayStr = localDateYYYYMMDD();
    if (dateYYYYMMDD < todayStr) return true;
    if (dateYYYYMMDD > todayStr) return false;

    const now = new Date();
    const end = new Date(now);

    if (session === 'morning') {
      end.setHours(11, 59, 0, 0);
    } else {
      end.setHours(17, 0, 0, 0);
    }

    return now.getTime() > end.getTime();
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const collections = ['officials', 'bhw', 'tanod'];
        const results = await Promise.all(
          collections.map(coll => getDocs(collection(db, coll)))
        );
        
        const allMembers: Official[] = results.flatMap((snapshot, index) => {
          return snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            // Ensure BHW/Tanod members are treated as "officials" for the list logic
            position: (doc.data() as any).position || (index === 1 ? 'BHW' : index === 2 ? 'Tanod' : 'Staff')
          } as Official));
        });

        setOfficials(allMembers);
      } catch (error: any) {
        console.error('Attendance fetch members error:', error);
        const code = typeof error?.code === 'string' ? error.code : '';
        const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
        window.alert(code ? `${code}: ${message}` : message);
        setOfficials([]);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const q = query(collection(db, 'attendance'), where('date', '==', selectedDate));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        setRecords(data);
      } catch (error: any) {
        console.error('Attendance fetch records error:', error);
        const code = typeof error?.code === 'string' ? error.code : '';
        const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
        window.alert(code ? `${code}: ${message}` : message);
        setRecords([]);
      }
    };
    fetchAttendance();
  }, [selectedDate]);

  const tableRows = useMemo(() => {
    const queryStr = search.trim().toLowerCase();
    const sessionFinished = isSessionWindowFinished(selectedDate);

    return officials
      .map((official) => {
        const record = records.find((r) => r.officialId === official.id);
        const timeIn = getSessionCheckIn(record);
        const timeOut = getSessionCheckOut(record);
        const hasAnyTime = Boolean(timeIn || timeOut);
        const status: 'present' | 'late' | 'absent' | 'pending' = hasAnyTime
          ? ((record?.status === 'late' ? 'late' : 'present') as 'present' | 'late')
          : (sessionFinished ? 'absent' : 'pending');

        return {
          official,
          record,
          timeIn,
          timeOut,
          status,
        };
      })
      .filter((row) => {
        if (queryStr) {
          const haystack = `${row.official.name} ${row.official.position}`.toLowerCase();
          if (!haystack.includes(queryStr)) return false;
        }
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        return true;
      });
  }, [officials, records, search, selectedDate, session, statusFilter]);

  const exportCsv = () => {
    const header = ['Name', 'Position', 'Date', 'Session', 'Time In', 'Time Out', 'Status'];
    const lines = tableRows.map((row) => [
      row.official.name,
      row.official.position,
      selectedDate,
      session === 'morning' ? 'AM' : 'PM',
      formatTime(row.timeIn),
      formatTime(row.timeOut),
      row.status,
    ]);

    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}_${session}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showScanOnly = (label: string) => {
    window.alert(`${label} is recorded via RFID scan on the ESP32 device.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Attendance</h1>
          <p className="text-sm text-[var(--muted)]">Mark attendance for barangay officials</p>
        </div>
      </div>

      <Card title="Attendance Records">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="ui-label mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ui-input ui-input-sm"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="ui-label mb-2">Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as any)}
                className="ui-select w-full"
              >
                <option value="morning">Morning (AM)</option>
                <option value="afternoon">Afternoon (PM)</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="ui-label mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="ui-select w-full"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="ui-label mb-2">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or position..."
                className="ui-input ui-input-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Showing <span className="font-semibold text-[var(--text)]">{tableRows.length}</span> of{' '}
              <span className="font-semibold text-[var(--text)]">{officials.length}</span> officials
            </p>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => showScanOnly('Time In')}>
                Time In
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => showScanOnly('Time Out')}>
                Time Out
              </button>
              <button type="button" className="btn btn-primary" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Position</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Time In</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Time Out</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-4 text-center text-sm text-[var(--muted)]">
                      No results.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.official.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--accent)]/5"
                    >
                      <td className="py-3 px-4 text-[var(--text)] font-medium">{row.official.name}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">{row.official.position}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">{formatTime(row.timeIn)}</td>
                      <td className="py-3 px-4 text-[var(--muted)]">{formatTime(row.timeOut)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            row.status === 'pending'
                              ? 'bg-[var(--surface-2)] text-[var(--muted)]'
                              : row.status === 'present'
                              ? 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]'
                              : row.status === 'late'
                              ? 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]'
                              : 'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Attendance;