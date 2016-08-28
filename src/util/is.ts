export let isArray = Array.isArray || function (v: any): boolean {
  return v != null && Object.prototype.toString.call(v) === '[object Array]'
}
