"""Toggle only the public frontend; preserve local ENV and compose customizations."""
import datetime
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request


def atomic_write(path, content, mode):
    descriptor, temporary = tempfile.mkstemp(prefix=".maintenance-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w") as stream:
            stream.write(content)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def inspect_config(directory):
    return json.loads(subprocess.check_output(
        ["docker", "compose", "-f", "compose.yml", "config", "--format", "json"],
        cwd=directory, text=True,
    ))


def http_state(path):
    request = urllib.request.Request("http://127.0.0.1:3000" + path)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        response = opener.open(request, timeout=8)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers.get("X-Cinema-Maintenance"), response.read()


def main():
    status = sys.argv[1] if len(sys.argv) == 2 else ""
    if status not in ("stop", "run"):
        raise SystemExit("Expected stop or run")
    directory = Path("/opt/next-public")
    compose = directory / "compose.yml"
    env = directory / ".env"
    config = inspect_config(directory)
    if config["services"]["public-front"].get("container_name") != "next-public-front":
        raise SystemExit("Unexpected public frontend configuration")
    revision = subprocess.check_output([
        "docker", "inspect", "--format", '{{index .Config.Labels "org.opencontainers.image.revision"}}',
        "next-public-front",
    ], text=True).strip()
    print("Frontend revision:", revision, flush=True)
    compose_before = compose.read_text()
    env_before = env.read_text() if env.exists() else None
    backup = directory / "backups" / ("maintenance-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
    backup.mkdir(parents=True, mode=0o700)
    shutil.copy2(compose, backup / "compose.yml")
    os.chmod(backup / "compose.yml", 0o600)
    if env.exists():
        shutil.copy2(env, backup / ".env")
        os.chmod(backup / ".env", 0o600)
    # Change one setting only; leave provider IDs, backend secrets, networks and ports intact.
    modified = compose_before
    if not re.search(r"^\s+CINEMA_STATUS:", modified, re.MULTILINE):
        anchor = "      NODE_ENV: production"
        if modified.count(anchor) != 1:
            raise SystemExit("Compose environment layout changed; refusing to overwrite it")
        modified = modified.replace(anchor, '      CINEMA_STATUS: "${CINEMA_STATUS:-run}"\n' + anchor)
    lines = [line for line in (env_before or "").splitlines()
             if not re.match(r"^\s*(?:export\s+)?CINEMA_STATUS\s*=", line)]
    lines.append("CINEMA_STATUS=" + status)
    try:
        atomic_write(compose, modified, 0o644)
        atomic_write(env, "\n".join(lines) + "\n", 0o600)
        actual = inspect_config(directory)["services"]["public-front"]["environment"].get("CINEMA_STATUS")
        if actual != status:
            raise RuntimeError("Compose did not accept the runtime status")
        subprocess.run(["docker", "compose", "-f", "compose.yml", "up", "-d", "--no-deps", "--force-recreate", "public-front"],
                       cwd=directory, check=True, timeout=90)
        ready = False
        for attempt in range(20):
            try:
                code, marker, body = http_state("/")
                ready = (code == 503 and marker == "on" and "Ведутся технические работы".encode() in body) if status == "stop" else (code == 200 and marker is None)
                if ready:
                    break
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(2)
        if not ready:
            raise RuntimeError("Frontend did not enter the requested mode")
        if status == "stop":
            for path in ("/detail/1114545?type=films", "/anime", "/dramas"):
                code, marker, body = http_state(path)
                if code != 503 or marker != "on":
                    raise RuntimeError("Maintenance direct-link check failed")
        print("CINEMA_STATUS=" + status + "; frontend verified; backend not restarted", flush=True)
    except Exception:
        atomic_write(compose, compose_before, 0o644)
        if env_before is None:
            env.unlink(missing_ok=True)
        else:
            atomic_write(env, env_before, 0o600)
        subprocess.run(["docker", "compose", "-f", "compose.yml", "up", "-d", "--no-deps", "--force-recreate", "public-front"], cwd=directory, timeout=90)
        raise


if __name__ == "__main__":
    main()
