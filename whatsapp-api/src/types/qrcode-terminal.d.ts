declare module 'qrcode-terminal' {
  interface GenerateOptions {
    small?: boolean;
  }
  export function generate(
    input: string,
    options?: GenerateOptions,
    callback?: (qrcode: string) => void,
  ): void;
}