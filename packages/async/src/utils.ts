export function arrReplicate<A>(n: number, a: A): A[] {
  let result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = a;
  }
  return result;
}
