export function dropLastIfNull(pieces: string[]): string[] {
  if (pieces[pieces.length - 1] === '') {
    return pieces.slice(0, pieces.length - 1);
  }
  return pieces;
}

export function relativeDirFromPieces(pieces: string[]): string {
  const dropped = pieces.slice(1);
  return dropped.map(piece => '../').join('');
}

export function defaultMkRedirect(pieces: string[], newPath: string): string {
  const relDir = relativeDirFromPieces(pieces);
  if (newPath.length == 0 || relDir.length === 0 ||
      relDir.charAt(relDir.length - 1) !== '/' || relDir.charAt(0) !== '/') {
    return relDir + newPath;
  }
  return relDir + newPath.slice(1);
}
