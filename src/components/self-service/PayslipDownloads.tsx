import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, IndianRupee, ArrowDownUp, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SalarySlipRaw {
  id?: string;
  month?: string | number;
  monthNumber?: number;
  year?: number;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  hra?: number;
  travelAllowance?: number;
  otherAllowances?: number;
  taxDeduction?: number;
  pfDeduction?: number;
  otherDeductions?: number;
  netSalary?: number;
  status?: string;
  [k: string]: any;
}

export default function PayslipDownloads() {
  const { user } = useAuth();
  const [slips, setSlips] = useState<SalarySlipRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!user) {
      setSlips([]);
      setLoading(false);
      return;
    }
    fetchSlips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'salary_slips'),
        where('employeeId', '==', user?.uid),
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SalarySlipRaw[];
      setSlips(normalizeSlips(data));
    } catch (err) {
      console.error('Error fetching salary slips', err);
      toast.error('Failed to load salary slips');
      setSlips([]);
    } finally {
      setLoading(false);
    }
  };

  const normalizeSlips = (items: SalarySlipRaw[]) =>
    items.map((s) => {
      let monthNum: number | undefined = undefined;
      if (typeof s.monthNumber === 'number') monthNum = s.monthNumber;
      else if (typeof s.month === 'number') monthNum = s.month;
      else if (typeof s.month === 'string') {
        const parsed = new Date(`${s.month} 1, ${s.year ?? new Date().getFullYear()}`);
        if (!Number.isNaN(parsed.getMonth())) monthNum = parsed.getMonth() + 1;
      }

      const monthName =
        monthNum && !Number.isNaN(monthNum)
          ? new Date((s.year ?? 2000), monthNum - 1).toLocaleString(undefined, { month: 'long' })
          : typeof s.month === 'string'
          ? s.month
          : 'Unknown';

      const coerce = (v: any) => (typeof v === 'number' ? v : Number(v) || 0);

      return {
        ...s,
        monthNumber: monthNum,
        month: monthName,
        basicSalary: coerce(s.basicSalary),
        allowances: s.allowances != null ? coerce(s.allowances) : undefined,
        deductions: s.deductions != null ? coerce(s.deductions) : undefined,
        hra: coerce(s.hra),
        travelAllowance: coerce(s.travelAllowance),
        otherAllowances: coerce(s.otherAllowances),
        taxDeduction: coerce(s.taxDeduction),
        pfDeduction: coerce(s.pfDeduction),
        otherDeductions: coerce(s.otherDeductions),
        netSalary: coerce(s.netSalary),
        year: s.year ?? new Date().getFullYear(),
        status: s.status ?? 'pending',
      } as SalarySlipRaw;
    });

  const totalAllowances = (s: SalarySlipRaw) => {
    if (typeof s.allowances === 'number' && s.allowances > 0) return s.allowances;
    return (s.hra || 0) + (s.travelAllowance || 0) + (s.otherAllowances || 0);
  };

  const totalDeductions = (s: SalarySlipRaw) => {
    if (typeof s.deductions === 'number' && s.deductions > 0) return s.deductions;
    return (s.taxDeduction || 0) + (s.pfDeduction || 0) + (s.otherDeductions || 0);
  };

  const fmt = (n?: number) =>
    `₹${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const sortedSlips = useMemo(() => {
    return [...slips].sort((a, b) => {
      if (sortBy === 'amount') {
        const amountA = a.netSalary || 0;
        const amountB = b.netSalary || 0;
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      } else {
        // Sort by date
        const dateA = new Date(a.year ?? 0, (a.monthNumber ?? 1) - 1);
        const dateB = new Date(b.year ?? 0, (b.monthNumber ?? 1) - 1);
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
      }
    });
  }, [slips, sortBy, sortOrder]);

  const getStatusVariant = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    switch (s) {
      case 'paid':
      case 'completed':
        return 'success';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleDownload = (s: SalarySlipRaw) => {
    try {
      const allowances = totalAllowances(s);
      const deductions = totalDeductions(s);
      const content = [
        `Payslip - ${s.month} ${s.year}`,
        `Employee ID: ${user?.uid ?? 'N/A'}`,
        `Basic Salary: ${fmt(s.basicSalary)}`,
        `---- Allowances ----`,
        `  HRA: ${fmt(s.hra)}`,
        `  Travel Allowance: ${fmt(s.travelAllowance)}`,
        `  Other Allowances: ${fmt(s.otherAllowances)}`,
        `  Total Allowances: ${fmt(allowances)}`,
        `---- Deductions ----`,
        `  Tax: ${fmt(s.taxDeduction)}`,
        `  PF: ${fmt(s.pfDeduction)}`,
        `  Other Deductions: ${fmt(s.otherDeductions)}`,
        `  Total Deductions: ${fmt(deductions)}`,
        `Net Salary: ${fmt(s.netSalary)}`,
        `Status: ${s.status}`,
        '',
        `Generated: ${new Date().toLocaleString()}`,
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeMonth = String(s.month).replace(/\s+/g, '_');
      a.download = `payslip_${safeMonth}_${s.year}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Downloading payslip for ${s.month} ${s.year}`);
    } catch (err) {
      console.error('Download error', err);
      toast.error('Unable to download payslip');
    }
  };

  const toggleSort = (newSortBy: 'date' | 'amount') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-blue-600 font-medium">Total Slips</div>
          <div className="text-lg md:text-2xl font-bold text-blue-900">{slips.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-green-600 font-medium">Latest Net</div>
          <div className="text-lg md:text-2xl font-bold text-green-900">
            {slips.length > 0 ? fmt(slips[0].netSalary) : '₹0'}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-orange-600 font-medium">This Year</div>
          <div className="text-lg md:text-2xl font-bold text-orange-900">
            {slips.filter(s => s.year === new Date().getFullYear()).length}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 md:p-4">
          <div className="text-xs md:text-sm text-purple-600 font-medium">Pending</div>
          <div className="text-lg md:text-2xl font-bold text-purple-900">
            {slips.filter(s => s.status?.toLowerCase() === 'pending').length}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Salary Slips</CardTitle>
                <CardDescription>View and download your salary slips</CardDescription>
              </div>
            </div>
            
            {/* Sort Controls - Mobile */}
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={sortBy === 'date' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleSort('date')}
                  className="h-8 px-2 text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Date
                  {sortBy === 'date' && (
                    <ArrowDownUp className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant={sortBy === 'amount' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleSort('amount')}
                  className="h-8 px-2 text-xs"
                >
                  <IndianRupee className="h-3 w-3 mr-1" />
                  Amount
                  {sortBy === 'amount' && (
                    <ArrowDownUp className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-3">Loading salary slips...</p>
            </div>
          ) : sortedSlips.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">No salary slips found</h3>
              <p className="text-muted-foreground mb-4">
                Your salary slips will appear here once they are processed.
              </p>
              <Button onClick={fetchSlips} variant="outline">
                Refresh
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[520px]">
                  <div className="min-w-[720px]">
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
                        {sortedSlips.map((s) => {
                          const allowances = totalAllowances(s);
                          const deductions = totalDeductions(s);
                          return (
                            <TableRow key={s.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {s.month} {s.year}
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">{fmt(s.basicSalary)}</TableCell>
                              <TableCell>
                                <div className="text-sm text-green-600">{fmt(allowances)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-red-600">{fmt(deductions)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-bold text-blue-600">{fmt(s.netSalary)}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(s.status)}>
                                  {s.status ?? 'pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(s)}
                                  className="hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 p-4">
                {sortedSlips.map((s) => {
                  const allowances = totalAllowances(s);
                  const deductions = totalDeductions(s);
                  return (
                    <Card key={s.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-base">
                                {s.month} {s.year}
                              </h3>
                              <Badge variant={getStatusVariant(s.status)} className="mt-1">
                                {s.status}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(s)}
                            className="shrink-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Net Salary Highlight */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs text-blue-600 font-medium">Net Salary</div>
                          <div className="text-xl font-bold text-blue-900">{fmt(s.netSalary)}</div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Basic</div>
                            <div className="text-sm font-semibold">{fmt(s.basicSalary)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Allowances</div>
                            <div className="text-sm font-semibold text-green-600">{fmt(allowances)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Deductions</div>
                            <div className="text-sm font-semibold text-red-600">{fmt(deductions)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground font-medium">Tax</div>
                            <div className="text-sm font-semibold">{fmt(s.taxDeduction)}</div>
                          </div>
                        </div>

                        {/* Detailed Breakdown - Collapsible */}
                        <div className="space-y-3">
                          <div className="border-t pt-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Allowance Details</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">HRA</div>
                                <div className="font-medium">{fmt(s.hra)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Travel</div>
                                <div className="font-medium">{fmt(s.travelAllowance)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Other</div>
                                <div className="font-medium">{fmt(s.otherAllowances)}</div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2">Deduction Details</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">PF</div>
                                <div className="font-medium">{fmt(s.pfDeduction)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Tax</div>
                                <div className="font-medium">{fmt(s.taxDeduction)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Other</div>
                                <div className="font-medium">{fmt(s.otherDeductions)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
