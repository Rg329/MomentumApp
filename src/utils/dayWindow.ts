/** True during typical end-of-day window (5 PM+ or within 2h of sleep). */
export function isEndOfDayWindow(sleepTimeMinutes: number): boolean {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const eveningStart = 17 * 60;
  const windDownStart = Math.max(eveningStart, sleepTimeMinutes - 120);
  return nowMins >= windDownStart;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
