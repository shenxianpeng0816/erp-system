/** WAREHOUSE / INBOUND — hide order totals and line amounts in UI */
export function hideOrderAmountsForRole(role: string | undefined): boolean {
  const r = String(role ?? '')
    .trim()
    .toUpperCase();
  return r === 'WAREHOUSE' || r === 'INBOUND';
}
