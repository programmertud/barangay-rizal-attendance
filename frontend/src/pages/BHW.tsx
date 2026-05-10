import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { db } from '../services/firebase';
import type { BHWMember } from '../types/bhw';

const BHW: React.FC = () => {
  const [members, setMembers] = useState<BHWMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', assignedArea: '', schedule: '', rfidUid: '' });
  const [isScanning, setIsScanning] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const safeRevokeObjectUrl = (value: string) => {
    if (value && value.startsWith('blob:')) URL.revokeObjectURL(value);
  };

  const resizeImageToDataUrl = async (file: File, maxSize: number = 320, quality: number = 0.8) => {
    const fileToDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(f);
      });

    const src = await fileToDataUrl(file);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Invalid image'));
      image.src = src;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL('image/jpeg', quality);
  };

  const refreshMembers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bhw'));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BHWMember));
      setMembers(data);
    } catch (error: any) {
      console.error('Error fetching BHW:', error);
      const code = typeof error?.code === 'string' ? error.code : '';
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
      window.alert(code ? `${code}: ${message}` : message);
      setMembers([]);
    }
  };

  useEffect(() => {
    return () => {
      safeRevokeObjectUrl(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    void refreshMembers();
  }, []);

  const startAdd = () => {
    setFormData({ name: '', email: '', phone: '', assignedArea: '', schedule: '', rfidUid: '' });
    setPhotoFile(null);
    safeRevokeObjectUrl(photoPreviewUrl);
    setPhotoPreviewUrl('');
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (member: BHWMember) => {
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      assignedArea: member.assignedArea || '',
      schedule: member.schedule || '',
      rfidUid: member.rfidUid || '',
    });
    setPhotoFile(null);
    safeRevokeObjectUrl(photoPreviewUrl);
    setPhotoPreviewUrl(member.photoDataUrl || '');
    setEditingId(member.id);
    setShowForm(true);
  };
 
  useEffect(() => {
    if (!isScanning) return;
 
    const unsub = onSnapshot(doc(db, 'rfidScans', 'latest'), (snap) => {
      const data = snap.data() as { uid?: string } | undefined;
      const uid = (data?.uid || '').trim();
      if (!uid) return;
 
      setFormData((prev) => ({ ...prev, rfidUid: uid }));
      setIsScanning(false);
      setDoc(doc(db, 'system', 'device_config'), { registrationMode: false }, { merge: true }).catch(console.error);
    }, (error) => {
      console.error('rfidScans/latest listener error:', error);
    });
 
    return () => unsub();
  }, [isScanning]);
 
  const handleScanRFID = async () => {
    try {
      setIsScanning(true);
      await setDoc(doc(db, 'system', 'device_config'), { 
        registrationMode: true,
        lastRequestedAt: new Date() 
      }, { merge: true });
      setTimeout(() => setIsScanning(false), 30000);
    } catch (error: any) {
      console.error('Error enabling registration mode:', error);
      const message = error?.message || 'Unknown error';
      window.alert(`Failed to connect to device: ${message}`);
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        rfidUid: (formData.rfidUid || '').trim().toUpperCase(),
      };

      let photoDataUrl = '';
      if (photoFile) {
        setSavingPhoto(true);
        try {
          photoDataUrl = await resizeImageToDataUrl(photoFile);
        } finally {
          setSavingPhoto(false);
        }
      }

      if (editingId) {
        await updateDoc(doc(db, 'bhw', editingId), {
          ...payload,
          ...(photoDataUrl ? { photoDataUrl } : {}),
        });
      } else {
        const docRef = await addDoc(collection(db, 'bhw'), {
          ...payload,
          createdAt: new Date(),
        });

        if (photoDataUrl) {
          await updateDoc(doc(db, 'bhw', docRef.id), { photoDataUrl });
        }
      }

      setFormData({ name: '', email: '', phone: '', assignedArea: '', schedule: '', rfidUid: '' });
      setPhotoFile(null);
      safeRevokeObjectUrl(photoPreviewUrl);
      setPhotoPreviewUrl('');
      setEditingId(null);
      setShowForm(false);
      await refreshMembers();
    } catch (error: any) {
      console.error('Error saving BHW:', error);
      const code = typeof error?.code === 'string' ? error.code : '';
      const message = typeof error?.message === 'string' ? error.message : 'Unknown error';
      window.alert(code ? `${code}: ${message}` : message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteDoc(doc(db, 'bhw', id))));
      setSelectedIds([]);
      await refreshMembers();
    } catch (error) {
      console.error('Error deleting BHW:', error);
    }
  };

  const filteredMembers = members
    .filter((m) => {
      const q = searchTerm.toLowerCase();
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.assignedArea || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredMembers.length / itemsPerPage));
  }, [filteredMembers.length, itemsPerPage]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(currentMembers.map((m) => m.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Barangay Health Workers (BHW)</h1>
          <p className="text-sm text-[var(--muted)]">Manage your BHW members</p>
        </div>
        <div>
          <button onClick={startAdd} className="btn btn-primary">
            Add BHW
          </button>
        </div>
      </div>

      <Modal 
        isOpen={showForm} 
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setFormData({ name: '', email: '', phone: '', assignedArea: '', schedule: '', rfidUid: '' });
          setPhotoFile(null);
          safeRevokeObjectUrl(photoPreviewUrl);
          setPhotoPreviewUrl('');
        }} 
        title={editingId ? 'Edit BHW' : 'Add New BHW'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {isScanning && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm animate-pulse">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              Waiting for device to scan RFID card...
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="ui-label mb-2">Photo</label>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                  {photoPreviewUrl ? (
                    <img src={photoPreviewUrl} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="ui-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPhotoFile(file);
                      setPhotoPreviewUrl((prev) => {
                        safeRevokeObjectUrl(prev);
                        if (file) return URL.createObjectURL(file);
                        return editingId ? prev : '';
                      });
                    }}
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">PNG/JPG recommended. Square image works best.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="ui-label mb-2">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="ui-input"
              />
            </div>

            <div>
              <label className="ui-label mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="ui-input"
              />
            </div>

            <div>
              <label className="ui-label mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="ui-input"
              />
            </div>

            <div>
              <label className="ui-label mb-2">Assigned Area</label>
              <input
                type="text"
                value={formData.assignedArea}
                onChange={(e) => setFormData({ ...formData, assignedArea: e.target.value })}
                className="ui-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="ui-label mb-2">Schedule</label>
              <input
                type="text"
                value={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                className="ui-input"
                placeholder="e.g. Mon-Fri 8AM-5PM"
              />
            </div>

            <div className="md:col-span-2">
              <label className="ui-label mb-2">RFID UID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.rfidUid}
                  onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value })}
                  className="ui-input flex-1"
                  placeholder="e.g. 04A1B2C3D4"
                />
                <button
                  type="button"
                  onClick={handleScanRFID}
                  disabled={isScanning}
                  className={`btn ${isScanning ? 'btn-ghost cursor-not-allowed' : 'btn-primary'} whitespace-nowrap`}
                >
                  {isScanning ? 'Scanning...' : 'Scan RFID'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-4 border-t border-[var(--border)]">
            <button type="submit" className="btn btn-success" disabled={savingPhoto}>
              {savingPhoto ? 'Uploading…' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ name: '', email: '', phone: '', assignedArea: '', schedule: '', rfidUid: '' });
                setPhotoFile(null);
                safeRevokeObjectUrl(photoPreviewUrl);
                setPhotoPreviewUrl('');
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Card title="BHW">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search BHW..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ui-input ui-input-sm"
              />
            </div>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted)]">{selectedIds.length} selected</span>
                <button onClick={handleDeleteSelected} className="btn btn-danger px-3 py-1">
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input
                type="checkbox"
                checked={selectedIds.length === currentMembers.length && currentMembers.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-[var(--border)] bg-[var(--surface-2)]"
              />
              Select page
            </label>
            <p className="text-sm text-[var(--muted)]">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMembers.length)} of {filteredMembers.length} members
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {currentMembers.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)] overflow-hidden"
              >
                <div className="relative h-40 bg-[var(--surface-2)]">
                  {m.photoDataUrl ? (
                    <img src={m.photoDataUrl} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" />
                  )}

                  <div className="absolute top-3 left-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={(e) => handleSelectOne(m.id, e.target.checked)}
                      className="h-5 w-5 rounded border-[var(--border)] bg-[var(--surface)]"
                    />
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text)]">{m.name}</p>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="text-[var(--muted)]">RFID: <span className="text-[var(--text)]">{m.rfidUid || '-'}</span></p>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={() => startEdit(m)} className="btn btn-sm btn-primary">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-ghost px-3 py-1 rounded-lg"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--muted)]">Page {currentPage}</span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="btn btn-ghost px-3 py-1 rounded-lg"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BHW;
