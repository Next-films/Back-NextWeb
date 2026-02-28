import { createWriteStream, unlink, mkdirSync } from 'fs';
import { join } from 'path';

export const storageUtil = {
  _handleFile(req, file, cb) {
    if (file.fieldname === 'videoFile') {
      const uploadDir = './temp';
      mkdirSync(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = join(uploadDir, filename);

      const outStream = createWriteStream(filePath);

      file.stream.pipe(outStream);
      outStream.on('error', cb);
      outStream.on('finish', () => {
        cb(null, {
          path: filePath,
          filename,
          size: outStream.bytesWritten,
        });
      });
    } else {
      const chunks: Buffer[] = [];
      file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.stream.on('end', () =>
        cb(null, { buffer: Buffer.concat(chunks), size: Buffer.concat(chunks).length }),
      );
      file.stream.on('error', cb);
    }
  },
  _removeFile(req, file, cb) {
    if (file.path) unlink(file.path, cb);
    else cb(null);
  },
};
