import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileText, Search, ChevronDownUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Payslip {
  id: string;
  month: string; // e.g. "January" or "01"
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export default function PayslipDownloads() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPayslips();
    } else {
      // if no user, clear
      setPayslips([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const qref = query(
        collection(db, 'salary_slips'),
        where('employeeId', '==', user?.uid),
        // orderBy requires indexes when multiple fields used on Firestore rules; keep initial order as year desc, month desc.
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const snapshot = await getDocs(qref);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Payslip[];
      // normalize month field to string (if stored as number)
      const normalized = data.map((p) => ({
        ...p,
        month:
          typeof p.month === 'number'
            ? new Date(p.year, p.month - 1).toLocaleString(undefined, { month: 'long' })
            : String(p.month),
      }));
      setPayslips(normalized);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  // derived lists for filters
  const years = useMemo(() => {
    const s = new Set<number>();
    payslips.forEach((p) => s.add(p.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [payslips]);

  // search + filter + sort
  const filtered = useMemo(() => {
    let list = payslips.slice();

    // search across month, year, salary fields
    if (q.trim()) {
      const token = q.trim().toLowerCase();
      list = list.filter((p) => {
        return (
          p.month.toLowerCase().includes(token) ||
          String(p.year).includes(token) ||
          String(p.basicSalary).includes(token) ||
          String(p.netSalary).includes(token)
        );
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
    }
    if (yearFilter !== 'all') {
      list = list.filter((p) => String(p.year) === yearFilter);
    }

    // sort by year then month (month name to Date)
    list.sort((a, b) => {
      if (a.year !== b.year) return sortAsc ? a.year - b.year : b.year - a.year;
      // parse month name to month number
      const ma = new Date(`${a.month} 1, ${a.year}`).getMonth();
      const mb = new Date(`${b.month} 1, ${b.year}`).getMonth();
      return sortAsc ? ma - mb : mb - ma;
    });

    return list;
  }, [payslips, q, statusFilter, yearFilter, sortAsc]);

  // format currency
  const fmt = (val?: number) =>
    `₹${(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // badge classes by status
  const badgeFor = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // simple download: create a payslip text file and trigger download
  const handleDownload = (p: Payslip) => {
    try {
      const content = [
        `Payslip for: ${p.month} ${p.year}`,
        `Employee ID: ${user?.uid ?? 'N/A'}`,
        `Basic Salary: ${fmt(p.basicSalary)}`,
        `Allowances: ${fmt(p.allowances)}`,
        `Deductions: ${fmt(p.deductions)}`,
        `Net Salary: ${fmt(p.netSalary)}`,
        `Status: ${p.status ?? 'pending'}`,
        '',
        'Generated by: Professional Hub',
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeMonth = p.month.replace(/\s+/g, '_');
      a.download = `payslip_${safeMonth}_${p.year}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Downloading payslip for ${p.month} ${p.year}`);
    } catch (err) {
      console.error(err);
      toast.error('Unable to download payslip');
    }
  };

  // Loading skeleton rows (for table) or list skeletons (for mobile)
  const SkeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="h-4 w-28 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-20 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
          <TableCell>
            <div className="h-8 w-24 bg-slate-200/60 rounded animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 w-full">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payslip Downloads
            </CardTitle>
            <CardDescription>Download your monthly payslips</CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </span>
              <input
                aria-label="Search payslips"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search month, year, amount..."
                className="pl-8 pr-3 py-2 rounded border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* filters */}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded border text-sm"
            >
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              aria-label="Filter by year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 rounded border text-sm"
            >
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortAsc((s) => !s)}
              aria-pressed={sortAsc}
              title="Toggle sort by date"
              className="hidden sm:inline-flex"
            >
              <ChevronDownUp className="w-4 h-4 mr-2" />
              {sortAsc ? 'Old → New' : 'New → Old'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          // Skeleton + mobile skeleton
          <div className="space-y-4">
            <div className="hidden md:block">
              <ScrollArea className="h-[420px]">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SkeletonRows />
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>

            <div className="md:hidden space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-md animate-pulse bg-white/30" />
              ))}
            </div>
          </div>
        ) : payslips.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-lg font-medium mb-2">No payslips available</div>
            <div className="max-w-sm mx-auto text-sm">
              Your payslips will appear here once processed. If you think this is a mistake,
              contact HR.
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <ScrollArea className="h-[500px]">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.month} {p.year}
                          </TableCell>
                          <TableCell>{fmt(p.basicSalary)}</TableCell>
                          <TableCell>{fmt(p.allowances)}</TableCell>
                          <TableCell>{fmt(p.deductions)}</TableCell>
                          <TableCell className="font-semibold">{fmt(p.netSalary)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs capitalize ${badgeFor(
                                p.status
                              )}`}
                            >
                              {p.status || 'pending'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(p)}
                              aria-label={`Download payslip for ${p.month} ${p.year}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>

            {/* Mobile list */}
            <div className="md:hidden space-y-3">
              {filtered.map((p) => (
                <article
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium truncate">
                        {p.month} {p.year}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${badgeFor(p.status)}`}
                        aria-hidden
                      >
                        {p.status || 'pending'}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500">Net</div>
                        <div className="font-semibold text-sm">{fmt(p.netSalary)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">Basic</div>
                        <div className="text-sm">{fmt(p.basicSalary)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(p)}
                      aria-label={`Download payslip for ${p.month} ${p.year}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {/* Footer / small summary */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing <span className="font-medium">{filtered.length}</span> of{' '}
                <span className="font-medium">{payslips.length}</span> payslips
              </div>
              <div className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // reset filters quick action
                    setQ('');
                    setStatusFilter('all');
                    setYearFilter('all');
                    setSortAsc(false);
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
