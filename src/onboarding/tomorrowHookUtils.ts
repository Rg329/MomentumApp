export function formatPeakWindowLabel(startMinutes: number, endMinutes: number): string {
  const fmt = (totalMinutes: number) => {
    const h24 = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    if (m === 0) return `${h12} ${ampm}`;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(startMinutes)}–${fmt(endMinutes)}`;
}
