/** Minutes from midnight → "8:00 AM" */
export function minutesToDisplayTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function durationMinutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** Every 30 minutes between start and end (inclusive). */
export function timeOptions(startMinutes: number, endMinutes: number, step = 30) {
  const options: Array<{ value: string; label: string; minutes: number }> = [];
  for (let m = startMinutes; m <= endMinutes; m += step) {
    options.push({
      value: String(m),
      label: minutesToDisplayTime(m),
      minutes: m,
    });
  }
  return options;
}
