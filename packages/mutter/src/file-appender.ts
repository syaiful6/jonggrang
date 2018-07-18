import { assign } from '@jonggrang/object';
import { FileUpload, Files, FileInfo } from './types';


export interface FilePlaceholder {
  fieldname: string;
}

export function insertPlaceholder(files: Files, file: FileUpload): FilePlaceholder {
  const placeholder = {
    fieldname: file.fieldname
  };
  if (files[file.fieldname]) {
    files[file.fieldname].push(placeholder as any);
  } else {
    files[file.fieldname] = [placeholder] as FileInfo[];
  }

  return placeholder;
}

export function removePlaceholder(files: Record<string, any>, placeholder: FilePlaceholder) {
  if (files[placeholder.fieldname].length === 1) {
    delete files[placeholder.fieldname];
  } else {
    arrayRemove(files[placeholder.fieldname], placeholder);
  }
}

export function replacePlaceholder(files: Record<string, any>, placeholder: FilePlaceholder, file: FileInfo) {
  delete placeholder.fieldname;
  assign(placeholder, file);
}

function arrayRemove(arr: any[], item: any) {
  const idx = arr.indexOf(item);
  if (~idx) arr.splice(idx, 1);
}
