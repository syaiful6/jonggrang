module.exports = function camelize(str) {
  return str.replace(/(\-|\_|\.|\s)+(.)?/g, function(match, separator, chr) {
    return chr ? chr.toUpperCase() : '';
  }).replace(/(^|\/)([A-Z])/g, function(match, separator, chr) {
    return match.toLowerCase();
  });
}
