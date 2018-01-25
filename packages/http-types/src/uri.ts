type Query = {
  [k: string]: any;
};

function pathSegments(str: string): string[] {
  return str === '' || str === '/' ? [] : normalizePath(str.split('/'));
}

function parseQuery(str: string): Query {
  if (str === '') return {};
  if (str.charAt(0) === '?') str = str.slice(1);
  const entries = str.split('&');
  const query: Query = {};
  const counters: any = {};
  for (let i = 0, len = entries.length; i < len; i++) {
    const entry = entries[i];
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
      let level: any = levels[j], nextLevel: any = levels[j + 1];
      let isNumber = nextLevel == "" || !isNaN(parseInt(nextLevel, 10));
      let isValue = j === levels.length - 1;
      if (level === "") {
				let key = levels.slice(0, j).join();
				if (counters[key] == null) counters[key] = 0;
				level = counters[key]++;
			}
			if (cursor[level] == null) {
				cursor[level] = isValue ? value : isNumber ? [] : {}
			}
			cursor = cursor[level];
    }
  }
  return query;
}

function normalizePath(paths: string[]) {
  return paths.length > 0 && paths[0] === '' ? paths.slice(1) : paths;
}
