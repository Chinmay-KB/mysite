declare module 'pngjs' {
  export class PNG {
    data: Buffer;
    width: number;
    height: number;
    constructor(options?: { width?: number; height?: number; filterType?: number });
    static sync: { read(buffer: Buffer): PNG; write(png: PNG): Buffer };
  }
}
