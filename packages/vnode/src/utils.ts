export function assign<T, S1, S2>(target: T, source1: S1, source2: S2): T & S1 & S2;
export function assign<T, S1>(target: T, source1: S1): T & S1;
export function assign<T>(target: T, ...sources: any[]): any {
  if (!target) {
    throw new Error("assign's target must be an object")
  }
  for (let source of sources) {
    if (source) {
      for (let key of Object.keys(source)) {
        (target as any)[key] = (source as any)[key];
      }
    }
  }
  return target;
}
