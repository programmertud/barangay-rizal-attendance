import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AttendanceRecord, Official } from '../types/official';
import Card from '../components/Card';
import AttendanceTable from '../components/AttendanceTable';

const localDateYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasAnyTime = (r?: AttendanceRecord) => {
  if (!r) return false;
  return Boolean(r.checkIn || r.checkOut || r.checkIn1 || r.checkOut1 || r.checkIn2 || r.checkOut2);
};

const Today: React.FC = () => {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => localDateYYYYMMDD(new Date()), []);

  const refresh = async () => {
    setLoading(true);
    try {
      const collections = ['officials', 'bhw', 'tanod'];
      const [responses, recordsSnapshot] = await Promise.all([
        Promise.all(collections.map(coll => getDocs(collection(db, coll)))),
        getDocs(collection(db, 'attendance')),
      ]);

      const officialsData: Official[] = responses.flatMap((snapshot, index) => {
        return snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          position: (doc.data() as any).position || (index === 1 ? 'BHW' : index === 2 ? 'Tanod' : 'Staff')
        } as Official));
      });

      const recordsData = recordsSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
        .filter((r) => r.date === today);

      setOfficials(officialsData);
      setRecords(recordsData);
    } catch (error: any) {
      console.error('Error fetching today view:', error);
      const code = typeof error?.code === 'string' ? error.code : '';
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
      window.alert(code ? `${code}: ${message}` : message);
      setOfficials([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [today]);

  const presentCount = useMemo(() => {
    const byId = new Map(records.map((r) => [r.officialId, r]));
    return officials.filter((o) => hasAnyTime(byId.get(o.id))).length;
  }, [officials, records]);

  const absentCount = useMemo(() => {
    return Math.max(0, officials.length - presentCount);
  }, [officials.length, presentCount]);

  const ongoingCount = useMemo(() => {
    const byId = new Map(records.map((r) => [r.officialId, r]));
    return officials.filter((o) => {
      const r = byId.get(o.id);
      if (!r) return false;
      const hasIn = Boolean(r.checkIn1 || r.checkIn2 || r.checkIn);
      const hasOut = Boolean(r.checkOut2 || r.checkOut1 || r.checkOut);
      return hasIn && !hasOut;
    }).length;
  }, [officials, records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Today</h1>
          <p className="text-sm text-[var(--muted)]">Quick view for {today}</p>
        </div>
        <button onClick={refresh} className="btn btn-ghost" disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Total Officials">
          <p className="text-4xl font-bold text-[var(--text)]">{officials.length}</p>
        </Card>
        <Card title="Present (Any Scan)">
          <p className="text-4xl font-bold text-emerald-400">{presentCount}</p>
        </Card>
        <Card title="Absent (No Scan)">
          <p className="text-4xl font-bold text-rose-400">{absentCount}</p>
        </Card>
      </div>

      <Card title="Ongoing (Checked in, not checked out)">
        <p className="text-sm text-[var(--muted)]">{ongoingCount} ongoing today</p>
      </Card>

      <Card title="Morning Session">
        <AttendanceTable officials={officials} records={records} session="morning" />
      </Card>

      <Card title="Afternoon Session">
        <AttendanceTable officials={officials} records={records} session="afternoon" />
      </Card>
    </div>
  );
};

export default Today;
