export interface Options {
  key: string; // key for encryption
  macKey: string; // key for mac
  encryptionKey?: Buffer;
  signatureKey?: Buffer;
  signatureAlgorithm?: 'sha256' | 'sha384' | 'sha512';
  encryptionAlgorithm?: 'aes128' | 'aes192' | 'aes256';
}
