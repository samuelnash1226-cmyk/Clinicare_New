import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DatabaseBackup, Download, Upload, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Clock, HardDrive, FileJson,
  ShieldCheck, RotateCcw, Info, Zap
} from 'lucide-react';

// ─── LocalStorage key constants ───────────────────────────────────────────────
const LS_BACKUP_INDEX = 'ndkc_backup_index';      // JSON array of BackupMeta
const LS_BACKUP_DATA  = (id: string) => `ndkc_backup_${id}`;
const MAX_BACKUPS     = 10;                         // keep last 10 snapshots

// ─── Types ────────────────────────────────────────────────────────────────────
interface BackupMeta {
  id: string;
  label: string;
  createdAt: string;       // ISO string
  visitCount: number;
  studentCount: number;
  inventoryCount: number;
  sizeBytes: number;
  source: 'manual' | 'auto';
}

interface BackupPayload {
  meta: BackupMeta;
  visits: any[];
  students: any[];
  inventory: any[];
  users: any[];
  settings: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Convert Firestore Timestamps inside objects to plain ISO strings so they JSON-serialize cleanly */
function sanitizeForStorage(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj?.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForStorage);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = sanitizeForStorage(obj[k]);
    return out;
  }
  return obj;
}

/** Re-hydrate ISO strings that look like Firestore timestamps back to Timestamp objects */
function rehydrateTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    return Timestamp.fromDate(new Date(obj));
  }
  if (Array.isArray(obj)) return obj.map(rehydrateTimestamps);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = rehydrateTimestamps(obj[k]);
    return out;
  }
  return obj;
}

// ─── Index helpers ────────────────────────────────────────────────────────────
function readIndex(): BackupMeta[] {
  try {
    return JSON.parse(localStorage.getItem(LS_BACKUP_INDEX) || '[]');
  } catch { return []; }
}

function writeIndex(list: BackupMeta[]) {
  localStorage.setItem(LS_BACKUP_INDEX, JSON.stringify(list));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LocalBackupManager() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [autoBackup, setAutoBackup] = useState(() =>
    localStorage.getItem('ndkc_auto_backup') === 'true'
  );
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load index & storage size ───────────────────────────────────────────────
  const refresh = () => {
    const index = readIndex().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setBackups(index);

    // Calculate total localStorage usage for ndkc_ keys
    let total = 0;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('ndkc_')) {
        total += (localStorage.getItem(key) || '').length * 2; // UTF-16 chars → bytes approx
      }
    }
    setStorageUsed(total);
  };

  useEffect(() => {
    refresh();
    // Auto-backup on mount if enabled
    if (localStorage.getItem('ndkc_auto_backup') === 'true') {
      createBackup('auto');
    }
  }, []);

  // ── Create a backup snapshot ────────────────────────────────────────────────
  const createBackup = async (source: 'manual' | 'auto' = 'manual') => {
    setCreating(true);
    setProgress('Fetching clinic visits…');
    try {
      const [visitsSnap, studentsSnap, inventorySnap, usersSnap, settingsSnap] =
        await Promise.all([
          getDocs(collection(db, 'clinicVisits')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'inventory')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'settings')),
        ]);

      setProgress('Serializing data…');

      const visits    = sanitizeForStorage(visitsSnap.docs.map(d  => ({ id: d.id, ...d.data() })));
      const students  = sanitizeForStorage(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const inventory = sanitizeForStorage(inventorySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const users     = sanitizeForStorage(usersSnap.docs.map(d  => ({ id: d.id, ...d.data() })));
      const settings  = sanitizeForStorage(settingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const id = uid();
      const now = new Date().toISOString();

      const payload: BackupPayload = {
        meta: {
          id, label: `Backup – ${formatDate(now)}`,
          createdAt: now, source,
          visitCount: visits.length,
          studentCount: students.length,
          inventoryCount: inventory.length,
          sizeBytes: 0,
        },
        visits, students, inventory, users, settings,
      };

      setProgress('Saving to local storage…');
      const json = JSON.stringify(payload);
      payload.meta.sizeBytes = json.length * 2;

      localStorage.setItem(LS_BACKUP_DATA(id), json);

      // Update index — evict oldest if over limit
      const index = readIndex();
      index.push(payload.meta);
      if (index.length > MAX_BACKUPS) {
        const evicted = index.splice(0, index.length - MAX_BACKUPS);
        for (const e of evicted) localStorage.removeItem(LS_BACKUP_DATA(e.id));
      }
      writeIndex(index);
      refresh();

      if (source === 'manual') {
        toast.success(
          `✅ Backup created! ${visits.length} visits, ${students.length} students saved locally.`
        );
      }
    } catch (err: any) {
      console.error('Backup error:', err);
      if (source === 'manual') toast.error(`Backup failed: ${err.message}`);
    } finally {
      setCreating(false);
      setProgress('');
    }
  };

  // ── Restore a backup to Firestore ───────────────────────────────────────────
  const restoreBackup = async (meta: BackupMeta) => {
    if (!confirm(
      `Restore backup from ${formatDate(meta.createdAt)}?\n\n` +
      `This will OVERWRITE existing Firestore documents with the backed-up data.\n` +
      `Existing records not in the backup are NOT deleted.\n\nProceed?`
    )) return;

    setRestoring(meta.id);
    setProgress('Loading backup data…');
    try {
      const raw = localStorage.getItem(LS_BACKUP_DATA(meta.id));
      if (!raw) throw new Error('Backup data not found in local storage.');

      const payload: BackupPayload = JSON.parse(raw);

      // Restore visits
      setProgress(`Restoring ${payload.visits.length} clinic visits…`);
      for (const item of payload.visits) {
        const { id, ...data } = rehydrateTimestamps(item);
        await setDoc(doc(db, 'clinicVisits', id), data, { merge: true });
      }

      // Restore students
      setProgress(`Restoring ${payload.students.length} students…`);
      for (const item of payload.students) {
        const { id, ...data } = rehydrateTimestamps(item);
        await setDoc(doc(db, 'students', id), data, { merge: true });
      }

      // Restore inventory
      setProgress(`Restoring ${payload.inventory.length} inventory items…`);
      for (const item of payload.inventory) {
        const { id, ...data } = rehydrateTimestamps(item);
        await setDoc(doc(db, 'inventory', id), data, { merge: true });
      }

      toast.success(
        `✅ Restore complete! ${payload.visits.length} visits, ` +
        `${payload.students.length} students, ` +
        `${payload.inventory.length} inventory items written back to Firestore.`
      );
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setRestoring(null);
      setProgress('');
    }
  };

  // ── Delete a backup ─────────────────────────────────────────────────────────
  const deleteBackup = (meta: BackupMeta) => {
    if (!confirm(`Delete this backup snapshot?\n\n${formatDate(meta.createdAt)}`)) return;
    setDeleting(meta.id);
    localStorage.removeItem(LS_BACKUP_DATA(meta.id));
    const index = readIndex().filter(b => b.id !== meta.id);
    writeIndex(index);
    refresh();
    setDeleting(null);
    toast.success('Backup deleted.');
  };

  // ── Export backup as JSON file ──────────────────────────────────────────────
  const exportBackup = (meta: BackupMeta) => {
    const raw = localStorage.getItem(LS_BACKUP_DATA(meta.id));
    if (!raw) { toast.error('Backup data missing.'); return; }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NDKC_Backup_${new Date(meta.createdAt).toISOString().split('T')[0]}_${meta.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exported as JSON file.');
  };

  // ── Import backup from JSON file ────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const payload: BackupPayload = JSON.parse(evt.target?.result as string);
        if (!payload?.meta || !payload?.visits) throw new Error('Invalid backup file format.');

        // Give it a fresh ID to avoid collisions
        const id = uid();
        payload.meta.id = id;
        payload.meta.label = `Imported – ${formatDate(payload.meta.createdAt)}`;
        payload.meta.sizeBytes = (evt.target?.result as string).length * 2;

        const json = JSON.stringify(payload);
        localStorage.setItem(LS_BACKUP_DATA(id), json);

        const index = readIndex();
        index.push(payload.meta);
        writeIndex(index);
        refresh();

        toast.success(
          `✅ Backup imported! ${payload.meta.visitCount} visits, ` +
          `${payload.meta.studentCount} students.`
        );
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-imported
    e.target.value = '';
  };

  // ── Toggle auto-backup ──────────────────────────────────────────────────────
  const toggleAutoBackup = () => {
    const next = !autoBackup;
    setAutoBackup(next);
    localStorage.setItem('ndkc_auto_backup', String(next));
    toast.success(next ? 'Auto-backup enabled (runs on every admin login).' : 'Auto-backup disabled.');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const storagePercent = Math.min((storageUsed / (5 * 1024 * 1024)) * 100, 100); // 5 MB approx limit

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-md shadow-indigo-500/20 text-white">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            Local Backup &amp; Restore
          </h1>
          <p className="mt-1 text-slate-600">
            Snapshot all Firestore data to your browser's local storage — restore instantly even after a database crash.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Import JSON */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="h-11 px-5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />

          {/* Create Backup */}
          <Button
            onClick={() => createBackup('manual')}
            disabled={creating}
            className="h-11 px-5 bg-gradient-to-r from-indigo-600 to-purple-700 shadow-lg shadow-indigo-500/30 hover:shadow-xl disabled:opacity-50"
          >
            {creating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {progress || 'Backing up…'}
              </>
            ) : (
              <>
                <DatabaseBackup className="mr-2 h-4 w-4" />
                Create Backup Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Status Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total snapshots */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Snapshots Stored</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{backups.length}</p>
                <p className="text-xs text-slate-400 mt-1">max {MAX_BACKUPS} kept</p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3">
                <HardDrive className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage used */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-500">Local Storage Used</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatBytes(storageUsed)}</p>
                <p className="text-xs text-slate-400 mt-1">of ~5 MB available</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            {/* Storage bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${storagePercent > 80 ? 'bg-red-500' : storagePercent > 50 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Last backup */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Last Backup</p>
                {backups[0] ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {new Date(backups[0].createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(backups[0].createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">No backups yet</p>
                )}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <Clock className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-backup toggle */}
        <Card
          className={`border-2 cursor-pointer transition-all shadow-sm ${autoBackup ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
          onClick={toggleAutoBackup}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Auto-Backup</p>
                <p className={`text-lg font-bold mt-1 ${autoBackup ? 'text-indigo-700' : 'text-slate-400'}`}>
                  {autoBackup ? 'ON' : 'OFF'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">on every login</p>
              </div>
              <div className={`rounded-xl p-3 transition-all ${autoBackup ? 'bg-indigo-200' : 'bg-slate-100'}`}>
                <ShieldCheck className={`h-6 w-6 ${autoBackup ? 'text-indigo-700' : 'text-slate-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <span className="font-semibold">How it works:</span> Backups are stored in this browser's
          local storage — they persist between sessions even without internet.&nbsp;
          Use <span className="font-semibold">Export JSON</span> to save a file copy offline,
          and <span className="font-semibold">Restore</span> to push data back to Firestore after a crash.
          Auto-backup runs silently every time an admin logs in.
        </div>
      </div>

      {/* ── Backup List ── */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-indigo-600" />
              Backup Snapshots
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {backups.length === 0
                ? 'No backups yet — click "Create Backup Now" to start.'
                : `${backups.length} snapshot${backups.length !== 1 ? 's' : ''} stored locally`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4">
              <DatabaseBackup className="h-16 w-16 opacity-20" />
              <p className="text-sm">No backups found. Create your first snapshot above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((b, idx) => (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    idx === 0
                      ? 'border-indigo-200 bg-indigo-50/60 shadow-sm'
                      : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    {/* Info */}
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 rounded-xl p-2.5 ${idx === 0 ? 'bg-indigo-200' : 'bg-slate-200'}`}>
                        {idx === 0
                          ? <CheckCircle2 className="h-5 w-5 text-indigo-700" />
                          : <Clock className="h-5 w-5 text-slate-500" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">
                            {formatDate(b.createdAt)}
                          </span>
                          {idx === 0 && (
                            <Badge className="bg-indigo-600 text-white text-xs">Latest</Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${b.source === 'auto' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-600'}`}
                          >
                            {b.source === 'auto' ? '⚡ Auto' : '👤 Manual'}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>🏥 {b.visitCount} visits</span>
                          <span>👨‍🎓 {b.studentCount} students</span>
                          <span>💊 {b.inventoryCount} inventory</span>
                          <span>💾 {formatBytes(b.sizeBytes)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {/* Export JSON */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportBackup(b)}
                        className="gap-1.5 border-slate-300 text-slate-600 hover:bg-slate-100"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export JSON
                      </Button>

                      {/* Restore */}
                      <Button
                        size="sm"
                        onClick={() => restoreBackup(b)}
                        disabled={!!restoring}
                        className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        {restoring === b.id ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            {progress || 'Restoring…'}
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore to Firestore
                          </>
                        )}
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBackup(b)}
                        disabled={deleting === b.id}
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Restore progress */}
                  {restoring === b.id && progress && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-100 rounded-lg px-3 py-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      {progress}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Danger / Notes ── */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">Restore note:</span> Restoring merges data back into Firestore using the saved document IDs.
          It does <span className="font-semibold">not</span> delete records that were added after the backup — it only overwrites matching documents.
          For a full rollback, contact your Firestore console directly.
        </div>
      </div>
    </div>
  );
}

