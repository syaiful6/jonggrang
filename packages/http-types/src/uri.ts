export type Query = {
  [k: string]: any;
};

export function pathSegments(str: string): string[] {
  return str === '' || str === '/' ? [] : normalizePath(str.split('/'));
}

/**
 * Split out the query string into an object
 *
 */
export function parseQuery(str: string): Query {
  if (str === '') return {};
  if (str.charAt(0) === '?') str = str.slice(1);
  const entries = str.split('&');
  const query: Query = {};
  const counters: any = {};
  for (let i = 0, len = entries.length; i < len; i++) {
    const entry = entries[i].split('=');
    let key = decodeURIComponent(entry[0]);
    let value: any = entry.length === 2 ? decodeURIComponent(entry[1]) : "";
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    let levels = key.split(/\]\[?|\[/);
    let cursor = query;
    if (key.indexOf("[") > -1) {
      levels.pop();
    }
    for (let j = 0, len2 = levels.length; j < len2; j++) {
      let level: any = levels[j];
      if (level === "") {
        let key = levels.slice(0, j).join();
        if (counters[key] == null) counters[key] = 0;
        level = counters[key]++;
      }
      if (cursor[level] == null) {
        let nextLevel: any = levels[j + 1];
        let isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10));
        let isValue = j === levels.length - 1;
        cursor[level] = isValue ? value : isNumber ? [] : {}
      }
      cursor = cursor[level];
    }
  }
  return query;
}

/**
 * Convert a Query object to string, the results string is not start with
 * question mark.
 */
export function renderQuery(obj: Query): string {
  if (Object.prototype.toString.call(obj) !== '[object Object]') {
    return '';
  }
  let args: string[] = [];
  for (let key in obj) {
    buildQuery(key, obj[key], args);
  }
  return args.join('&');
}

function buildQuery(key: string, value: any, xs: string[]) {
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) {
      buildQuery(`${key}[${i}]`, value[i], xs);
    }
  } else if (Object.prototype.toString.call(value) === '[object Object]') {
    for (let i in value) {
      buildQuery(`${key}[${i}]`, value[i], xs);
    }
  } else {
    xs.push(encodeURIComponent(key) + (value != null && value !== '' ? '=' + encodeURIComponent(value) : ''))
  }
}

function normalizePath(paths: string[]) {
  return paths.length > 0 && paths[0] === '' ? paths.slice(1) : paths;
}
