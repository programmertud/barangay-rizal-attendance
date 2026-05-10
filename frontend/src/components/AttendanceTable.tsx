import type { AttendanceRecord, Official } from '../types/official';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  officials: Official[];
  session?: 'morning' | 'afternoon';
}

const formatTime = (value: any) => {
  if (!value) return '-';
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleTimeString();
  }
  if (value instanceof Date) {
    return value.toLocaleTimeString();
  }
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return '-';
  }
};

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, officials, session = 'morning' }) => {
  const getOfficialName = (id: string) => {
    const official = officials.find(o => o.id === id);
    return official ? official.name : 'Unknown';
  };

  const getSessionCheckIn = (record: AttendanceRecord) => {
    if (session === 'afternoon') return record.checkIn2;
    return record.checkIn1 ?? record.checkIn;
  };

  const getSessionCheckOut = (record: AttendanceRecord) => {
    if (session === 'afternoon') return record.checkOut2;
    return record.checkOut1 ?? record.checkOut;
  };

  if (records.length === 0) {
    return <div className="p-4 text-center text-[var(--muted)]">No attendance records found.</div>;
  }

  return (
    <div className="w-full">
      {/* Mobile view (Cards) */}
      <div className="md:hidden space-y-4">
        {records.map((record) => {
          const timeIn = getSessionCheckIn(record);
          const timeOut = getSessionCheckOut(record);
          const hasSessionTime = Boolean(timeIn || timeOut);
          const displayStatus = hasSessionTime ? record.status : 'absent';
          
          return (
            <div key={record.id} className="bg-[rgba(255,255,255,0.03)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[var(--text)] text-lg">{getOfficialName(record.officialId)}</p>
                  <p className="text-xs text-[var(--muted)]">{record.date}</p>
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    displayStatus === 'present' ? 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]' :
                    displayStatus === 'late' ? 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]' :
                    'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]'
                  }`}>
                    {displayStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-[var(--surface-2)] rounded-xl p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mb-1">Check In</p>
                  <p className="text-sm text-[var(--text)]">{formatTime(timeIn)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-bold mb-1">Check Out</p>
                  <p className="text-sm text-[var(--text)]">{formatTime(timeOut)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop view (Table) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Official</th>
              <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Date</th>
              <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Check In</th>
              <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Check Out</th>
              <th className="py-4 px-4 text-sm font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const timeIn = getSessionCheckIn(record);
              const timeOut = getSessionCheckOut(record);
              const hasSessionTime = Boolean(timeIn || timeOut);
              const displayStatus = hasSessionTime ? record.status : 'absent';

              return (
                <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="py-4 px-4 text-[var(--text)] font-medium">
                    {getOfficialName(record.officialId)}
                  </td>
                  <td className="py-4 px-4 text-[var(--muted)] text-sm">
                    {record.date}
                  </td>
                  <td className="py-4 px-4 text-[var(--muted)] text-sm font-mono">
                    {formatTime(timeIn)}
                  </td>
                  <td className="py-4 px-4 text-[var(--muted)] text-sm font-mono">
                    {formatTime(timeOut)}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      displayStatus === 'present' ? 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]' :
                      displayStatus === 'late' ? 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]' :
                      'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]'
                    }`}>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;