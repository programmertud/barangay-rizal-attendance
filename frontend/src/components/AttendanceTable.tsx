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

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Official</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Check In</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Check Out</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--muted)]">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)]/5">
              <td className="py-3 px-4 text-[var(--text)] font-medium">
                {getOfficialName(record.officialId)}
              </td>
              <td className="py-3 px-4 text-[var(--muted)]">
                {record.date}
              </td>
              <td className="py-3 px-4 text-[var(--muted)]">
                {formatTime(getSessionCheckIn(record))}
              </td>
              <td className="py-3 px-4 text-[var(--muted)]">
                {formatTime(getSessionCheckOut(record))}
              </td>
              <td className="py-3 px-4">
                {(() => {
                  const timeIn = getSessionCheckIn(record);
                  const timeOut = getSessionCheckOut(record);
                  const hasSessionTime = Boolean(timeIn || timeOut);
                  const displayStatus = hasSessionTime ? record.status : 'absent';
                  
                  return (
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      displayStatus === 'present' ? 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]' :
                      displayStatus === 'late' ? 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]' :
                      'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]'
                    }`}>
                      {displayStatus}
                    </span>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;