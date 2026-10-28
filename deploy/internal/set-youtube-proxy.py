#!/usr/bin/env python3
"""Set the dedicated reader proxy from stdin, without printing secret values."""
import os
import re
import shutil
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urlsplit


def main():
    if len(sys.argv) != 2:
        raise ValueError('Expected one existing runtime ENV path')
    path = Path(sys.argv[1])
    if not path.is_file() or path.is_symlink():
        raise ValueError('Runtime ENV must be an existing regular file, not a symlink')
    value = sys.stdin.readline().strip()
    url = urlsplit(value)
    if (url.scheme not in ('http', 'https') or not url.hostname
            or url.path not in ('', '/') or url.query or url.fragment
            or any(c in value for c in '\r\n\x00\'"$`\\')
            or url.hostname in ('45.9.117.71', '2a01:e5c0:4c8d::2',
                                'next-films.ru', 'www.next-films.ru', 'server.next-films.ru')):
        raise ValueError('Invalid dedicated proxy URL')
    # Force parsing/validation of a supplied port before touching the ENV.
    _ = url.port
    stat = path.stat()
    content = path.read_text()
    key = re.compile(r'^\s*(?:export\s+)?YOUTUBE_PROXY_URL\s*=')
    lines = [line for line in content.splitlines(keepends=True) if not key.match(line)]
    updated = ''.join(lines)
    if updated and not updated.endswith('\n'):
        updated += '\n'
    updated += 'YOUTUBE_PROXY_URL=' + value + '\n'
    backup = path.with_name(path.name + '.before-youtube-proxy.' + str(time.time_ns()))
    backup_fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(backup_fd, 'wb') as saved, path.open('rb') as original:
        shutil.copyfileobj(original, saved)
        saved.flush()
        os.fsync(saved.fileno())
    os.chown(backup, stat.st_uid, stat.st_gid)
    fd, temporary = tempfile.mkstemp(prefix='.youtube-env-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as output:
            os.fchmod(output.fileno(), 0o600)
            os.fchown(output.fileno(), stat.st_uid, stat.st_gid)
            output.write(updated)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('Dedicated YouTube proxy configured; backup: ' + str(backup))


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Never echo a malformed URL or credentials, even in a parser error.
        print('Cannot update dedicated YouTube proxy configuration', file=sys.stderr)
        sys.exit(1)
