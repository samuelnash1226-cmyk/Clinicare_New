import { useState, useEffect } from 'react';
import { getBeds, addBed, deleteBed, releaseBed, Bed, BedBranch, formatBedRestDuration } from '../lib/firestore-setup';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  BedDouble,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  GraduationCap,
  BookOpen,
  Loader2,
  X,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const BRANCHES: { id: BedBranch; label: string; icon: React.ElementType; color: string; bg: string; border: string; badge: string }[] = [
  {
    id: 'IBED',
    label: 'IBED',
    icon: BookOpen,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  {
    id: 'SHS',
    label: 'Senior High School',
    icon: GraduationCap,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700 border-violet-300',
  },
  {
    id: 'College',
    label: 'College',
    icon: Building2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
];

export function BedManagement() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<BedBranch>('IBED');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBedName, setNewBedName] = useState('');
  const [newBedBranch, setNewBedBranch] = useState<BedBranch>('IBED');
  const [adding, setAdding] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBeds();
  }, []);

  const loadBeds = async () => {
    setLoading(true);
    try {
      const data = await getBeds();
      setBeds(data);
    } catch (err) {
      toast.error('Failed to load beds');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBed = async () => {
    if (!newBedName.trim()) {
      toast.error('Please enter a bed name');
      return;
    }
    setAdding(true);
    try {
      await addBed(newBedName.trim(), newBedBranch);
      toast.success(`${newBedName} added successfully`);
      setNewBedName('');
      setShowAddModal(false);
      await loadBeds();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add bed');
    } finally {
      setAdding(false);
    }
  };

  const handleRelease = async (bed: Bed) => {
    setReleasingId(bed.id);
    try {
      await releaseBed(bed.id);
      toast.success(`${bed.bedName} is now Available`);
      await loadBeds();
    } catch (err: any) {
      toast.error(err.message || 'Failed to release bed');
    } finally {
      setReleasingId(null);
    }
  };

  const handleDelete = async (bed: Bed) => {
    setDeletingId(bed.id);
    try {
      await deleteBed(bed.id);
      toast.success(`${bed.bedName} deleted`);
      await loadBeds();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bed');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredBeds = beds.filter(b => b.branch === activeTab);
  const activeBranch = BRANCHES.find(b => b.id === activeTab)!;
  const BranchIcon = activeBranch.icon;

  const totalOccupied = beds.filter(b => b.status === 'Occupied').length;
  const totalAvailable = beds.filter(b => b.status === 'Available').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <BedDouble className="h-5 w-5 text-white" />
            </div>
            Bed Management
          </h1>
          <p className="mt-1 text-slate-600">Manage clinic beds across IBED, SHS, and College departments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadBeds}
            className="gap-2 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => { setNewBedBranch(activeTab); setShowAddModal(true); }}
            className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Bed
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <BedDouble className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{beds.length}</p>
              <p className="text-sm text-slate-500">Total Beds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{totalAvailable}</p>
              <p className="text-sm text-emerald-600">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{totalOccupied}</p>
              <p className="text-sm text-amber-600">Occupied</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm w-fit">
        {BRANCHES.map(branch => {
          const Icon = branch.icon;
          const isActive = activeTab === branch.id;
          const branchBeds = beds.filter(b => b.branch === branch.id);
          const occupiedCount = branchBeds.filter(b => b.status === 'Occupied').length;
          return (
            <button
              key={branch.id}
              onClick={() => setActiveTab(branch.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? `bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/30`
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {branch.label}
              {occupiedCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  {occupiedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Beds Grid */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <BranchIcon className={`h-5 w-5 ${activeBranch.color}`} />
          <h2 className="text-lg font-semibold text-slate-800">{activeBranch.label} Beds</h2>
          <Badge variant="outline" className="ml-1 text-slate-500">
            {filteredBeds.length} bed{filteredBeds.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-sky-500 mb-3" />
            <p className="text-slate-500">Loading beds...</p>
          </div>
        ) : filteredBeds.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-white">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BedDouble className="h-14 w-14 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No beds in {activeBranch.label}</p>
              <p className="text-sm text-slate-400 mt-1">Click "Add Bed" to create one</p>
              <Button
                onClick={() => { setNewBedBranch(activeTab); setShowAddModal(true); }}
                className="mt-4 gap-2 bg-gradient-to-r from-sky-500 to-blue-600"
                size="sm"
              >
                <Plus className="h-4 w-4" /> Add First Bed
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filteredBeds.map((bed, index) => {
                const isOccupied = bed.status === 'Occupied';
                return (
                  <motion.div
                    key={bed.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${
                      isOccupied
                        ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-amber-100'
                        : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-emerald-100'
                    }`}>
                      {/* Status stripe */}
                      <div className={`absolute left-0 top-0 h-full w-1.5 ${isOccupied ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                      <CardContent className="pl-6 pt-5 pb-4 pr-4">
                        {/* Bed icon + name */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isOccupied ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                              <BedDouble className={`h-5 w-5 ${isOccupied ? 'text-amber-600' : 'text-emerald-600'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-sm leading-tight">{bed.bedName}</p>
                              <Badge
                                variant="outline"
                                className={`mt-1 text-xs px-2 py-0 ${isOccupied ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}
                              >
                                {isOccupied ? '🔴 Occupied' : '🟢 Available'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Occupying student */}
                        {isOccupied && bed.currentStudentName && (
                          <div className="mb-3 rounded-lg bg-amber-100/80 px-3 py-2 border border-amber-200 space-y-1">
                            <p className="text-xs text-amber-600 font-medium">Current Patient</p>
                            <p className="text-sm font-semibold text-amber-800">{bed.currentStudentName}</p>
                            {bed.currentBedStartTime && (
                              <div className="flex items-center justify-between text-xs text-amber-700 pt-1 border-t border-amber-200/60">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  Duration:
                                </span>
                                <span className="font-semibold">{formatBedRestDuration(bed.currentBedStartTime)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          {isOccupied ? (
                            <Button
                              size="sm"
                              onClick={() => handleRelease(bed)}
                              disabled={releasingId === bed.id}
                              className="flex-1 h-8 text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-sm"
                            >
                              {releasingId === bed.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              Release Bed
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(bed)}
                              disabled={deletingId === bed.id}
                              className="flex-1 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              {deletingId === bed.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Trash2 className="h-3 w-3 mr-1" />
                              )}
                              Remove
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Bed Modal */}
      <Dialog open={showAddModal} onOpenChange={open => { if (!open) { setShowAddModal(false); setNewBedName(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-sky-500" />
              Add New Bed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bed Name</label>
              <Input
                id="new-bed-name"
                value={newBedName}
                onChange={e => setNewBedName(e.target.value)}
                placeholder="e.g., IBED Bed 5"
                className="h-11 border-2 focus:border-sky-400"
                onKeyDown={e => { if (e.key === 'Enter') handleAddBed(); }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Branch / Department</label>
              <div className="grid grid-cols-3 gap-2">
                {BRANCHES.map(branch => {
                  const Icon = branch.icon;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setNewBedBranch(branch.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                        newBedBranch === branch.id
                          ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {branch.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddBed}
                disabled={adding || !newBedName.trim()}
                className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 shadow-md"
              >
                {adding ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" /> Add Bed</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowAddModal(false); setNewBedName(''); }}
                className="px-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
