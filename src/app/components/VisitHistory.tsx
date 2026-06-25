import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Calendar, User, Stethoscope, AlertCircle, Check, Filter, X, ChevronLeft, ChevronRight, CalendarRange, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { MedicalCertificateModal } from './MedicalCertificateModal';

interface Visit {
  id: string;
  studentName: string;
  grade: string;
  symptoms: string;
  treatment: string;
  notes?: string;
  nurseName: string;
  pickupRequired: boolean;
  timestamp: any;
  createdAt: any;
  status?: string;
}

interface Filters {
  searchTerm: string;
  datePreset: 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate: Date | undefined;
  endDate: Date | undefined;
  gradeFilter: string;
  statusFilter: string;
}

export function VisitHistory() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const itemsPerPage = 25;

  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    datePreset: 'all',
    startDate: undefined,
    endDate: undefined,
    gradeFilter: 'all',
    statusFilter: 'all',
  });

  useEffect(() => {
    loadVisits();
    loadAvailableGrades();
  }, [filters, currentPage]);

  const loadAvailableGrades = async () => {
    try {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      const grades = Array.from(new Set(snapshot.docs.map(doc => doc.data().grade).filter(Boolean)));
      setAvailableGrades(grades.sort());
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.datePreset) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 86400000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      case 'custom':
        if (filters.startDate && filters.endDate) {
          return {
            start: filters.startDate,
            end: new Date(filters.endDate.getTime() + 86400000)
          };
        }
        return null;
      default:
        return null;
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);

      let visitsQuery = query(
        collection(db, 'clinicVisits'),
        orderBy('timestamp', 'desc')
      );

      // Apply date filters
      const dateRange = getDateRange();
      if (dateRange) {
        visitsQuery = query(
          collection(db, 'clinicVisits'),
          where('timestamp', '>=', Timestamp.fromDate(dateRange.start)),
          where('timestamp', '<', Timestamp.fromDate(dateRange.end)),
          orderBy('timestamp', 'desc')
        );
      }

      const visitsSnapshot = await getDocs(visitsQuery);
      let visitsData = visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Visit[];

      // Apply client-side filters
      visitsData = visitsData.filter(visit => {
        // Search filter
        const searchMatch = !filters.searchTerm ||
          visit.studentName?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          visit.symptoms?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          visit.grade?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          visit.nurseName?.toLowerCase().includes(filters.searchTerm.toLowerCase());

        // Grade filter
        const gradeMatch = filters.gradeFilter === 'all' || visit.grade === filters.gradeFilter;

        // Status filter
        const statusMatch = filters.statusFilter === 'all' ||
          (filters.statusFilter === 'pickup' && visit.pickupRequired) ||
          (filters.statusFilter === 'completed' && !visit.pickupRequired);

        return searchMatch && gradeMatch && statusMatch;
      });

      // Pagination
      const totalItems = visitsData.length;
      setTotalPages(Math.ceil(totalItems / itemsPerPage));
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedVisits = visitsData.slice(startIndex, startIndex + itemsPerPage);

      setVisits(paginatedVisits);
    } catch (error) {
      console.error('Error loading visits:', error);
      toast.error('Failed to load visit history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      datePreset: 'all',
      startDate: undefined,
      endDate: undefined,
      gradeFilter: 'all',
      statusFilter: 'all',
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return filters.searchTerm ||
      filters.datePreset !== 'all' ||
      filters.gradeFilter !== 'all' ||
      filters.statusFilter !== 'all';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-slate-900">Visit History</h1>
          <p className="mt-2 text-slate-600">
            Complete record of all clinic visits with advanced filtering
          </p>
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant={showFilters ? "default" : "outline"}
          className={showFilters ? "bg-ndkc-green hover:bg-emerald-700" : ""}
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters() && (
            <Badge className="ml-2 bg-red-500 text-white">
              {[filters.searchTerm, filters.datePreset !== 'all', filters.gradeFilter !== 'all', filters.statusFilter !== 'all'].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-ndkc-green" />
                    Advanced Filters
                  </CardTitle>
                  {hasActiveFilters() && (
                    <Button
                      onClick={resetFilters}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search Filter */}
                  <div className="space-y-2">
                    <Label className="text-slate-700">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Student, symptoms..."
                        value={filters.searchTerm}
                        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Date Preset Filter */}
                  <div className="space-y-2">
                    <Label className="text-slate-700">Date Range</Label>
                    <Select
                      value={filters.datePreset}
                      onValueChange={(value: any) => {
                        // Clear custom dates when switching away from custom
                        if (value !== 'custom') {
                          setFilters({ ...filters, datePreset: value, startDate: undefined, endDate: undefined });
                        } else {
                          setFilters({ ...filters, datePreset: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Grade Filter */}
                  <div className="space-y-2">
                    <Label className="text-slate-700">Grade Level</Label>
                    <Select
                      value={filters.gradeFilter}
                      onValueChange={(value) => setFilters({ ...filters, gradeFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {availableGrades.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-slate-700">Status</Label>
                    <Select
                      value={filters.statusFilter}
                      onValueChange={(value) => setFilters({ ...filters, statusFilter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pickup">Pickup Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Date Range */}
                {filters.datePreset === 'custom' && (
                  <div className="space-y-4 pt-4 border-t border-emerald-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Select both start and end dates to filter visits
                      </p>
                      {(filters.startDate || filters.endDate) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFilters({ ...filters, startDate: undefined, endDate: undefined })}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear Dates
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700">Start Date</Label>
                        <Button
                          variant="outline"
                          onClick={() => setShowStartDatePicker(true)}
                          className={`w-full justify-start text-left font-normal ${!filters.startDate && 'text-slate-500'}`}
                        >
                          <CalendarRange className="mr-2 h-4 w-4" />
                          {filters.startDate ? format(filters.startDate, 'PPP') : 'Pick a start date'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700">End Date</Label>
                        <Button
                          variant="outline"
                          onClick={() => setShowEndDatePicker(true)}
                          className={`w-full justify-start text-left font-normal ${!filters.endDate && 'text-slate-500'}`}
                        >
                          <CalendarRange className="mr-2 h-4 w-4" />
                          {filters.endDate ? format(filters.endDate, 'PPP') : 'Pick an end date'}
                        </Button>
                      </div>
                    </div>

                    {filters.startDate && filters.endDate && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-900">
                          <strong>Filtering:</strong> {format(filters.startDate, 'PPP')} to {format(filters.endDate, 'PPP')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visits Table */}
      <Card className="border-slate-200 bg-white shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Clinic Visits</CardTitle>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-ndkc-green mb-4" />
              <p className="text-slate-500">Loading visits...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Symptoms</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Nurse</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-12 w-12 text-slate-300" />
                            <p className="text-slate-500">No visits found</p>
                            {hasActiveFilters() && (
                              <Button
                                onClick={resetFilters}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                Clear Filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      visits.map(visit => (
                        <TableRow key={visit.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900">
                                {formatDate(visit.timestamp || visit.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-emerald-600" />
                              <span className="font-medium text-slate-900">{visit.studentName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{visit.grade}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 max-w-xs truncate" title={visit.symptoms}>
                            {visit.symptoms}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 max-w-xs truncate" title={visit.treatment}>
                            {visit.treatment}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 max-w-xs truncate" title={visit.notes || 'None'}>
                            {visit.notes || <span className="text-slate-400 italic">No notes</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-slate-700">{visit.nurseName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {visit.pickupRequired ? (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pickup Required
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <Check className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => {
                                setSelectedVisit(visit);
                                setShowCertificate(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-ndkc-green hover:bg-ndkc-green/10 hover:text-ndkc-green"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                  <p className="text-sm text-slate-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, visits.length)} visits
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={currentPage === pageNum ? "bg-ndkc-green hover:bg-emerald-700" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Start Date Picker Dialog */}
      <Dialog open={showStartDatePicker} onOpenChange={setShowStartDatePicker}>
        <DialogContent className="w-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Select Start Date</DialogTitle>
          </DialogHeader>
          <CalendarComponent
            mode="single"
            selected={filters.startDate}
            onSelect={(date) => {
              setFilters({ ...filters, startDate: date || undefined });
              setShowStartDatePicker(false);
            }}
            className="p-4"
          />
        </DialogContent>
      </Dialog>

      {/* End Date Picker Dialog */}
      <Dialog open={showEndDatePicker} onOpenChange={setShowEndDatePicker}>
        <DialogContent className="w-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Select End Date</DialogTitle>
          </DialogHeader>
          <CalendarComponent
            mode="single"
            selected={filters.endDate}
            onSelect={(date) => {
              setFilters({ ...filters, endDate: date || undefined });
              setShowEndDatePicker(false);
            }}
            disabled={(date) => {
              if (filters.startDate) {
                return date < filters.startDate;
              }
              return false;
            }}
            className="p-4"
          />
        </DialogContent>
      </Dialog>

      {/* Medical Certificate Modal */}
      {showCertificate && selectedVisit && (
        <MedicalCertificateModal
          visitData={{
            visitId: selectedVisit.id,
            studentName: selectedVisit.studentName,
            grade: selectedVisit.grade,
            symptoms: selectedVisit.symptoms,
            treatment: selectedVisit.treatment,
            notes: selectedVisit.notes,
            nurseName: selectedVisit.nurseName,
            timestamp: selectedVisit.timestamp?.toDate
              ? selectedVisit.timestamp.toDate()
              : new Date(selectedVisit.timestamp || selectedVisit.createdAt),
          }}
          onClose={() => {
            setShowCertificate(false);
            setSelectedVisit(null);
          }}
        />
      )}
    </div>
  );
}
