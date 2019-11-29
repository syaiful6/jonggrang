export function divideInt(x: number, y: number): number {
  if (y === 0) return 0;
  const q = Math.trunc(x / y);
  const r = x % y;
  return r < 0 ? (y > 0 ? q - 1 : q + 1) : q;
}
