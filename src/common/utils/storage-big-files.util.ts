import { createWriteStream, unlink, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

export const storageUtil = {
  _handleFile(req, file, cb) {
    const isVideo = file.fieldname === 'videoFile' || file.mimetype?.startsWith('video/');

    if (isVideo) {
      const uploadDir = './temp';
      mkdirSync(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = join(uploadDir, filename);

      const outStream = createWriteStream(filePath, { encoding: null as any });
      let chunkChecked = false;

      file.stream.on('data', chunk => {
        if (!chunkChecked) {
          chunkChecked = true;
          const isBuffer = Buffer.isBuffer(chunk);
          const type = typeof chunk;
          const encoding = file.stream.readableEncoding;
          const stateEnc = file.stream._readableState?.encoding;
          const hexHead = isBuffer
            ? chunk.subarray(0, 16).toString('hex')
            : '(string chunk, see below)';
          console.log(
            `[storageUtil] First chunk: isBuffer=${isBuffer}, type=${type}, encoding=${encoding}, stateEncoding=${stateEnc}, chunkLen=${chunk.length}, first16bytes=${hexHead}`,
          );
          if (!isBuffer) {
            const strChunk = String(chunk);
            const asLatin1 = Buffer.from(strChunk, 'latin1');
            const asUtf8 = Buffer.from(strChunk, 'utf8');
            console.log(
              `[storageUtil] String chunk hex (latin1): ${asLatin1
                .subarray(0, 32)
                .toString('hex')}`,
            );
            console.log(
              `[storageUtil] String chunk hex (utf8):   ${asUtf8.subarray(0, 32).toString('hex')}`,
            );
          }
        }

        // CRITICAL: if chunk arrives as a string (UTF-8 decoded), the binary data
        // is already corrupted (invalid bytes replaced with U+FFFD).
        // Always ensure we write raw Buffer data.
        if (Buffer.isBuffer(chunk)) {
          outStream.write(chunk);
        } else {
          // String chunk — something upstream set encoding on the stream.
          // Use 'latin1' to preserve raw bytes (1:1 byte mapping).
          outStream.write(Buffer.from(String(chunk), 'latin1'));
        }
      });

      file.stream.on('error', cb);
      file.stream.on('end', () => {
        outStream.end(() => {
          const saved = readFileSync(filePath);
          const hexHead = saved.subarray(0, 16).toString('hex');
          console.log(
            `[storageUtil] File saved: ${filePath}, size: ${saved.length}, first16bytes: ${hexHead}`,
          );

          cb(null, {
            path: filePath,
            filename,
            size: saved.length,
          });
        });
      });
    } else {
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        cb(null, { buffer, size: buffer.length });
      });
      file.stream.on('error', cb);
    }
  },
  _removeFile(req, file, cb) {
    const filePath = (file as { path?: unknown })?.path;

    if (typeof filePath === 'string') {
      unlink(filePath, error => cb(error ?? null));
      return;
    }
    cb(null);
  },
};
