module.exports = Array.isArray || function isArray(v) {
  return v != null && Object.prototype.toString.call(v) === '[object Array]'
}
