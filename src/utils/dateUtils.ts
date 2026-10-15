/**
 * Date utility functions for offline formatting and calculations.
 */

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMonthYearDisplay(monthYearStr: string): string {
  if (!monthYearStr) return 'N/A';
  const parts = monthYearStr.split('-');
  if (parts.length !== 2) return monthYearStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;

  const d = new Date(year, month, 1);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

export function getMonthDateRange(monthYearStr: string): { startDate: string; endDate: string } {
  const parts = monthYearStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12

  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function getMonthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();

  // Generate current month and past 11 months + next 2 months
  for (let offset = 2; offset >= -11; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    options.push({ label, value });
  }

  return options;
}

/** Adds `days` to a YYYY-MM-DD date string (local calendar). */
export function shiftDateString(date: string, days: number): string {
  const [y, m, d] = date.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}
