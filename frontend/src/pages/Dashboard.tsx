import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { AttendanceRecord, Official } from '../types/official';
import Card from '../components/Card';

const localDateYYYYMMDD = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Dashboard: React.FC = () => {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ totalOfficials: 0, presentToday: 0, absentToday: 0 });
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const collections = ['officials', 'bhw', 'tanod'];
    const responses = await Promise.all(collections.map(coll => getDocs(collection(db, coll))));
    
    const officialsData: Official[] = responses.flatMap((snapshot, index) => {
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        position: (doc.data() as any).position || (index === 1 ? 'BHW' : index === 2 ? 'Tanod' : 'Staff')
      } as Official));
    });
    setOfficials(officialsData);

    const today = localDateYYYYMMDD();
    const attendanceSnapshot = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)));
    const attendanceData = attendanceSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord));

    const hasAnyTime = (record: any) => {
      return Boolean(
        record?.checkIn || record?.checkOut ||
        record?.checkIn1 || record?.checkOut1 ||
        record?.checkIn2 || record?.checkOut2
      );
    };

    const timedRecords = attendanceData.filter((r: any) => hasAnyTime(r));

    const sorted = [...timedRecords].sort((a: any, b: any) => {
      const aIn = a?.checkIn2 || a?.checkIn1 || a?.checkIn;
      const bIn = b?.checkIn2 || b?.checkIn1 || b?.checkIn;
      const aMs = typeof aIn?.toDate === 'function' ? aIn.toDate().getTime() : (aIn ? new Date(aIn as any).getTime() : 0);
      const bMs = typeof bIn?.toDate === 'function' ? bIn.toDate().getTime() : (bIn ? new Date(bIn as any).getTime() : 0);
      return bMs - aMs;
    });
    setRecentAttendance(sorted.slice(0, 10));

    const presentToday = timedRecords.filter((record: any) => Boolean(record.checkIn || record.checkIn1 || record.checkIn2)).length;
    const absentToday = Math.max(0, officialsData.length - presentToday);

    setStats({
      totalOfficials: officialsData.length,
      presentToday,
      absentToday,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        await fetchData();
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setOfficials([]);
        setRecentAttendance([]);
        setStats({ totalOfficials: 0, presentToday: 0, absentToday: 0 });
      }
    };

    load();
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchData();
    } catch (err) {
      console.error('Dashboard refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetToday = async () => {
    if (resetting) return;

    const confirmText = window.prompt('Type RESET to clear today\'s attendance');
    if (confirmText !== 'RESET') return;

    setResetting(true);
    try {
      const today = localDateYYYYMMDD();
      const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)));
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'attendance', d.id))));

      const officialsSnapshot = await getDocs(collection(db, 'officials'));
      const officialsData = officialsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Official));
      setOfficials(officialsData);

      setRecentAttendance([]);
      setStats({ totalOfficials: officialsData.length, presentToday: 0, absentToday: officialsData.length });
    } catch (err) {
      console.error('Reset today attendance error:', err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Welcome back">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text)]">Good day, Administrator</h2>
                <p className="text-sm text-[var(--muted)]">Here's a quick summary of today's attendance.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-secondary" type="button">
                  Add Official
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="btn btn-secondary"
                >
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
                <button
                  onClick={handleResetToday}
                  disabled={resetting}
                  className="btn btn-danger"
                >
                  {resetting ? 'Resetting…' : 'Reset Today'}
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card title="Total Officials">
            <p className="text-4xl font-bold text-[var(--accent)]">{stats.totalOfficials}</p>
          </Card>
          <Card title="Present Today">
            <p className="text-4xl font-bold text-[var(--chip-success-text)]">{stats.presentToday}</p>
          </Card>
        </div>
      </div>

      <Card title="Recent Attendance">
        <div className="space-y-3">
          {recentAttendance.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No attendance records for today.</p>
          ) : (
            recentAttendance.map((record) => {
              const official = officials.find((o) => o.id === record.officialId);
              return (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">{official?.name || 'Unknown'}</p>
                    <p className="text-xs text-[var(--muted)]">{record.date}</p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                      record.status === 'present'
                        ? 'bg-[var(--chip-success-bg)] text-[var(--chip-success-text)]'
                        : record.status === 'late'
                        ? 'bg-[var(--chip-warn-bg)] text-[var(--chip-warn-text)]'
                        : 'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-text)]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {record.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;