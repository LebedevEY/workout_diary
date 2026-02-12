export function isValidDateDDMMYYYY(date: string): boolean {
  const regex = /^\d{2}\.\d{2}\.\d{4}$/;
  if (!regex.test(date)) return false;
  const [dd, mm, yyyy] = date.split('.');
  const y = parseInt(yyyy, 10);
  const m = parseInt(mm, 10);
  const d = parseInt(dd, 10);
  const dt = new Date(y, m - 1, d);
  return (
    !isNaN(dt.getTime()) &&
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

export function ddmmyyyyToISO(date: string): string {
  const [dd, mm, yyyy] = date.split('.');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function isoToDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
