declare module 'append-field' {

  interface AppendField {
    (store: Record<string, any>, key: string, val: any): void;
  }

  namespace AppendField {}

  const appendField: AppendField;

  export = appendField;
}
