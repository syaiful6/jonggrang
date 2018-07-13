import { Either, isLeft, left, isRight, isJust } from '@jonggrang/prelude';
import { Folder, FolderName, Piece, File } from './types';


export function defaultListing(pieces: Piece[], folder: Folder): string {
  const isTop = pieces.length === 0 || (pieces.length === 1 && pieces[0] === '');
  const fps = isTop ? folder : ([left('')] as Folder).concat(folder);
  const title = pieces.join('/');
  let html = [
    '<!doctype html>',
    '<html>',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width">',
    `    <title>Index of ${title === '' ? 'root folder' : title}</title>`,
    '    <style type="text/css">',
    '      table { margin: 0 auto; width: 760px; border-collapse: collapse; font-family: \'sans-serif\'; }',
    '      table, th, td { border: 1px solid #353948; }',
    '      td.size { text-align: right; font-size: 0.7em; width: 50px }',
    '      td.date { text-align: right; font-size: 0.7em; width: 130px }',
    '      td { padding-right: 1em; padding-left: 1em; }',
    '      th.first { background-color: white; width: 24px }',
    '      td.first { padding-right: 0; padding-left: 0; text-align: center }',
    '      tr { background-color: white; }',
    '      tr.alt { background-color: #A3B5BA}',
    '      th { background-color: #3C4569; color: white; font-size: 1.125em; }',
    '      h1 { width: 760px; margin: 1em auto; font-size: 1em; font-family: sans-serif }',
    '      img { width: 20px }',
    '      a { text-decoration: none }',
    '    </style>',
    '  </head>',
    '<body>',
    `  <h1>Index of ${title === '' ? 'root folder' : title}</h1>`,
    renderDirectoryContentsTable(pieces, fps)
  ].join('\n');

  return `${html}\n</body></html>`;
}

function compareFolder(fa: Either<FolderName, File>, fb: Either<FolderName, File>): 0 | 1 | -1 {
  if (isLeft(fa) && isRight(fb)) {
    return -1;
  }
  if (isRight(fa) && isLeft(fb)) {
    return 1;
  }
  if (isLeft(fa) && isLeft(fb)) {
    return fa < fb ? -1 : fa === fb ? 0 : 1;
  }
  if (isRight(fa) && isRight(fb)) {
    let a = fa.value.name, b = fb.value.name;
    return a < b ? -1 : a === b ? 0 : 1;
  }
  // should never reached here
  return 0;
}

function renderDirectoryContentsTable(pieces: Piece[], folder: Folder): string {
  let table = [
    '<table>',
    '  <thead>',
    '    <th class="first"></th>', // todo image
    '    <th>Name</th>',
    '    <th>Modified</th>',
    '    <th>Size</th>',
    '  </thead>',
    '  <tbody>'
  ].join('\n');

  const sorted = folder.sort(compareFolder);
  let alt: boolean;
  let item: Either<FolderName, File>;
  let name: string;
  let href: string;
  for (let i = 0, len = sorted.length; i < len; i++) {
    alt = (i % 2) === 0;
    item = sorted[i];
    name = isLeft(item) ? (item.value === '' ? '..' : item.value) : item.value.name;
    href = addCurrentDir(pieces, name)
    table += alt ? '<tr class="alt">' : '<tr>\n';
    table += `<td class="first${isLeft(item) ? ' icon-dir' : ''}"></td>\n`;
    table += `<td><a href="${href}">${name}</a></td>\n`;
    table += `<td>${isRight(item) && isJust(item.value.getModified)
      ? formatCalender(item.value.getModified.value) : ''}</td>\n`;
    table += `<td>${isRight(item) ? prettyShow(item.value.size) : ''}</td>\n`;
    table += '</tr>\n';
  }

  table += '  </tbody>\n';
  table += '</table>\n';
  return table;
}

function formatCalender(date: Date) {
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hours = date.getHours();
  let minutes = date.getMinutes();

  return `${pad(day)}-${pad(month)}-${year} ${pad(hours)}:${pad(minutes)}`;
}

function pad(d: number): string {
  return d >= 10 ? ('' + d) : '0' + d;
}

function prettyShow(size: number): string {
  if (size < 1024) {
    return `${size}B`;
  }
  const units = ['k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  let u = -1;
  do {
    size /= 1024;
    u += 1;
  } while (size >= 1024);

  let b = size.toFixed(1);

  return b + units[u];
}

function addCurrentDir(xs: string[], x: string): string {
  return xs.length > 0 && xs[xs.length - 1] === '' ? x
    : xs.length === 0 ? x
      : [xs[xs.length - 1], '/', x].join();
}
