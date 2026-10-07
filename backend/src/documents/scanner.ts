import { createConnection } from "node:net";
import { AppError } from "../domain/errors.js";

export type DocumentScanner = (bytes: Buffer) => Promise<void>;
export function clamScanner(socketPath: string, timeoutMs = 10000): DocumentScanner {
  return (bytes) => new Promise<void>((resolve, reject) => {
    const socket = createConnection({ path: socketPath });
    let response = Buffer.alloc(0);
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true; clearTimeout(timer); socket.destroy();
      if (error) reject(error); else resolve();
    };
    const unavailable = () => finish(new AppError("DOCUMENTS_UNAVAILABLE", "Provjera dokumenta trenutačno nije dostupna. Dokument nije spremljen."));
    const timer = setTimeout(unavailable, timeoutMs);
    socket.on("error", unavailable);
    socket.on("close", () => { if (!settled) unavailable(); });
    socket.on("connect", () => {
      socket.write(Buffer.from("zINSTREAM\0"));
      const size = Buffer.alloc(4); size.writeUInt32BE(bytes.length);
      socket.write(size); socket.write(bytes); socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk: Buffer) => {
      response = Buffer.concat([response, chunk]);
      if (response.length > 1024) { unavailable(); return; }
      const terminator = response.indexOf(0);
      if (terminator < 0) return;
      if (terminator !== response.length - 1) { unavailable(); return; }
      const result = response.subarray(0, terminator).toString("utf8");
      if (result === "stream: OK") finish();
      else if (/^stream: [^\r\n]+ FOUND$/.test(result)) finish(new AppError("VALIDATION_FAILED", "Dokument nije prošao sigurnosnu provjeru. Učitajte drugi PDF."));
      else unavailable();
    });
  });
}
