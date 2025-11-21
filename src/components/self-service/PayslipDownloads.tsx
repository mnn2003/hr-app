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
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SalarySlipRaw {
  id?: string;
  month?: string | number; // either 'January' or 1-12
  monthNumber?: number; // optional explicit month number 1-12
  year?: number;
  basicSalary?: number;

  // aggregated
  allowances?: number;
  deductions?: number;

  // detailed allowances
  hra?: number;
  travelAllowance?: number;
  otherAllowances?: number;

  // detailed deductions
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
      // Keep ordering by year desc then month (if you store monthNumber use that)
      const q = query(
        collection(db, 'salary_slips'),
        where('employeeId', '==', user?.uid),
        orderBy('year', 'desc'),
        // if you have numeric month field use orderBy('monthNumber','desc') instead
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

  // Normalize month names / numbers and ensure numeric fields are numbers
  const normalizeSlips = (items: SalarySlipRaw[]) =>
    items.map((s) => {
      // Determine month number: priority monthNumber -> numeric month -> parse month string
      let monthNum: number | undefined = undefined;
      if (typeof s.monthNumber === 'number') monthNum = s.monthNumber;
      else if (typeof s.month === 'number') monthNum = s.month;
      else if (typeof s.month === 'string') {
        const parsed = new Date(`${s.month} 1, ${s.year ?? new Date().getFullYear()}`);
        if (!Number.isNaN(parsed.getMonth())) monthNum = parsed.getMonth() + 1;
      }

      // Convert month number to long month name for display
      const monthName =
        monthNum && !Number.isNaN(monthNum)
          ? new Date((s.year ?? 2000), monthNum - 1).toLocaleString(undefined, { month: 'long' })
          : typeof s.month === 'string'
          ? s.month
          : 'Unknown';

      // coerce numeric fields
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

  // compute totals: allow aggregated field first, else compute from detailed ones
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

  // sort slips by year desc then monthNumber desc (if available)
  const sortedSlips = useMemo(() => {
    return [...slips].sort((a, b) => {
      if ((b.year ?? 0) - (a.year ?? 0) !== 0) return (b.year ?? 0) - (a.year ?? 0);
      // use monthNumber if present, else fallback to month string parse
      const ma = a.monthNumber ?? new Date(`${a.month} 1, ${a.year}`).getMonth() + 1;
      const mb = b.monthNumber ?? new Date(`${b.month} 1, ${b.year}`).getMonth() + 1;
      return mb - ma;
    });
  }, [slips]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payslips
            </CardTitle>
            <CardDescription>View and download your salary slips</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading payslips...</div>
        ) : sortedSlips.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No salary slips available</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <ScrollArea className="h-[520px]">
                <div className="min-w-[720px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {sortedSlips.map((s) => {
                        const allowances = totalAllowances(s);
                        const deductions = totalDeductions(s);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.month} {s.year}
                            </TableCell>
                            <TableCell>{fmt(s.basicSalary)}</TableCell>
                            <TableCell>{fmt(allowances)}</TableCell>
                            <TableCell>{fmt(deductions)}</TableCell>
                            <TableCell className="font-semibold">{fmt(s.netSalary)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${badgeFor(s.status)}`}>
                                {s.status ?? 'pending'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(s)}
                                aria-label={`Download payslip for ${s.month} ${s.year}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {sortedSlips.map((s) => {
                const allowances = totalAllowances(s);
                const deductions = totalDeductions(s);
                return (
                  <div
                    key={s.id}
                    className="p-4 border rounded-lg bg-white/50 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium truncate">
                          {s.month} {s.year}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs ${badgeFor(s.status)}`}>
                          {s.status}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500">Basic</div>
                          <div className="font-medium">{fmt(s.basicSalary)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Net</div>
                          <div className="font-medium text-green-600">{fmt(s.netSalary)}</div>
                        </div>

                        <div className="col-span-2 mt-2">
                          <div className="text-[11px] text-slate-500">Allowances</div>
                          <div className="text-sm">
                            HRA: {fmt(s.hra)} · Travel: {fmt(s.travelAllowance)} · Other:{' '}
                            {fmt(s.otherAllowances)}
                          </div>
                          <div className="mt-1 font-medium">Total: {fmt(allowances)}</div>
                        </div>

                        <div className="col-span-2 mt-2">
                          <div className="text-[11px] text-slate-500">Deductions</div>
                          <div className="text-sm">
                            Tax: {fmt(s.taxDeduction)} · PF: {fmt(s.pfDeduction)} · Other:{' '}
                            {fmt(s.otherDeductions)}
                          </div>
                          <div className="mt-1 font-medium">Total: {fmt(deductions)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(s)}
                        aria-label={`Download payslip for ${s.month} ${s.year}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
