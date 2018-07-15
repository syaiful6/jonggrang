export const errorMessages = {
  'LIMIT_PART_COUNT': 'Too many parts',
  'LIMIT_FILE_SIZE': 'File too large',
  'LIMIT_FILE_COUNT': 'Too many files',
  'LIMIT_FIELD_KEY': 'Field name too long',
  'LIMIT_FIELD_VALUE': 'Field value too long',
  'LIMIT_FIELD_COUNT': 'Too many fields',
  'LIMIT_UNEXPECTED_FILE': 'Unexpected field'
};

export interface MutterError extends Error {
  code: string;
  field: string;
}

export function makeError(code: keyof (typeof errorMessages), optionalField?: string) {
  const err = new Error(errorMessages[code]) as MutterError;
  err.code = code;
  if (optionalField) err.field = optionalField;
  return err;
}
