import { createWriteStream, unlink, mkdirSync, statSync } from 'fs';
import { join } from 'path';

export const storageUtil = {
  _handleFile(req, file, cb) {
    const isVideo = file.fieldname === 'videoFile' || file.mimetype?.startsWith('video/');

    if (isVideo) {
      const uploadDir = './temp';
      mkdirSync(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = join(uploadDir, filename);

      const outStream = createWriteStream(filePath);

      file.stream.pipe(outStream);

      file.stream.on('error', cb);
      outStream.on('finish', () => {
        const stat = statSync(filePath);
        cb(null, {
          path: filePath,
          filename,
          size: stat.size,
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
