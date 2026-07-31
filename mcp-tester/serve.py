#!/usr/bin/env python3
"""
MCP Route Tester launcher.

Serves the PWA and reverse-proxies its API calls to the real MCP-Server, so the
phone only ever talks to THIS process (one origin, plain HTTP). That sidesteps
browser CORS and HTTPS/mixed-content rules and lets Flask session cookies
round-trip, which is what makes the admin/login routes testable.

Zero dependencies — Python 3.7+ standard library only.

    python3 serve.py                 # listen on 0.0.0.0:8080
    python3 serve.py --port 9000
    python3 serve.py --target http://192.168.1.50:5000   # optional default target

Then, from a phone on the same WiFi, open  http://<this-machine-ip>:8080
and set the MCP-Server base URL in Settings (or pass --target to prefill nothing;
the URL is always taken from the app's X-MCP-Target header at request time).

The proxy will forward requests to whatever host the app names. It is a plain
LAN development tool — do not expose it to an untrusted network.
"""
import argparse
import http.client
import os
import socket
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

HERE = os.path.dirname(os.path.abspath(__file__))
PROXY_PREFIX = "/__mcp/"

# Headers we must not blindly copy between hops.
HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", "content-length", "host",
}

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def strip_cookie_attrs(set_cookie: str) -> str:
    """Rewrite an upstream Set-Cookie so the browser accepts it for our origin.

    Drops Domain (so it binds to the launcher host) and Secure (we serve plain
    HTTP on the LAN). Keeps name=value, Path, HttpOnly, SameSite, Max-Age.
    """
    parts = [p.strip() for p in set_cookie.split(";")]
    kept = []
    for i, part in enumerate(parts):
        low = part.lower()
        if i == 0:
            kept.append(part)  # the name=value pair
        elif low.startswith("domain="):
            continue
        elif low == "secure":
            continue
        else:
            kept.append(part)
    return "; ".join(kept)


class Handler(BaseHTTPRequestHandler):
    server_version = "MCPTester/1.0"
    default_target = None

    # -- logging: quieter, single line --
    def log_message(self, fmt, *args):
        sys.stderr.write("  %s - %s\n" % (self.address_string(), fmt % args))

    # -- dispatch --
    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def do_PUT(self):
        self._route()

    def do_DELETE(self):
        self._route()

    def do_HEAD(self):
        self._route()

    def _route(self):
        if self.path.startswith(PROXY_PREFIX):
            self._proxy()
        else:
            self._static()

    # -- static file serving (the PWA shell) --
    def _static(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", ""):
            path = "/index.html"
        # prevent path traversal
        rel = os.path.normpath(path).lstrip("/\\")
        full = os.path.join(HERE, rel)
        if not full.startswith(HERE) or not os.path.isfile(full):
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(full)[1].lower()
        ctype = CONTENT_TYPES.get(ext, "application/octet-stream")
        try:
            with open(full, "rb") as f:
                data = f.read()
        except OSError:
            self.send_error(404, "Not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    # -- reverse proxy to the MCP-Server --
    def _proxy(self):
        target = self.headers.get("X-MCP-Target") or self.default_target
        if not target:
            self._json_error(400, "No target: set the MCP-Server base URL in the app (X-MCP-Target).")
            return

        upstream_path = "/" + self.path[len(PROXY_PREFIX):]
        u = urlsplit(target)
        if u.scheme not in ("http", "https") or not u.hostname:
            self._json_error(400, "Bad target URL: %r" % target)
            return
        base_path = u.path.rstrip("/")
        full_path = base_path + upstream_path

        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        # Build outgoing headers.
        out = {}
        for k, v in self.headers.items():
            lk = k.lower()
            if lk in HOP_BY_HOP or lk in ("x-mcp-target", "x-mcp-cookie"):
                continue
            out[k] = v
        out["Host"] = u.netloc
        out["Accept-Encoding"] = "identity"  # avoid gzip so we can pass bytes through
        cookie_override = self.headers.get("X-MCP-Cookie")
        if cookie_override:
            out["Cookie"] = cookie_override

        port = u.port or (443 if u.scheme == "https" else 80)
        try:
            if u.scheme == "https":
                import ssl
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE  # LAN test tool; self-signed certs are common
                conn = http.client.HTTPSConnection(u.hostname, port, timeout=15, context=ctx)
            else:
                conn = http.client.HTTPConnection(u.hostname, port, timeout=15)
            conn.request(self.command, full_path or "/", body=body, headers=out)
            resp = conn.getresponse()
            payload = resp.read()
        except (socket.timeout, TimeoutError):
            self._json_error(504, "Upstream timed out: %s" % target)
            return
        except (ConnectionError, http.client.HTTPException, OSError) as e:
            self._json_error(502, "Cannot reach %s — %s" % (target, e))
            return
        finally:
            try:
                conn.close()
            except Exception:
                pass

        self.send_response(resp.status)
        for k, v in resp.getheaders():
            lk = k.lower()
            if lk in HOP_BY_HOP or lk == "content-encoding":
                continue
            if lk == "set-cookie":
                self.send_header("Set-Cookie", strip_cookie_attrs(v))
            elif lk in ("content-security-policy", "x-frame-options", "strict-transport-security"):
                continue  # would fight the tester UI / force https
            else:
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def _json_error(self, code, msg):
        data = ('{"proxy_error": %s}' % _json_str(msg)).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)


def _json_str(s: str) -> str:
    out = ['"']
    for ch in s:
        if ch in '"\\':
            out.append("\\" + ch)
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) < 0x20:
            out.append("\\u%04x" % ord(ch))
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def local_ips():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(i for i in ips if not i.startswith("127."))


def main():
    ap = argparse.ArgumentParser(description="Serve the MCP Route Tester PWA + proxy.")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--target", default=None,
                    help="Optional default MCP-Server base URL used when the app "
                         "doesn't send an X-MCP-Target header.")
    args = ap.parse_args()

    Handler.default_target = args.target.rstrip("/") if args.target else None

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print("MCP Route Tester")
    print("  serving   : %s" % HERE)
    if args.target:
        print("  default target: %s" % Handler.default_target)
    print("  open on your phone (same WiFi):")
    ips = local_ips() or ["<this-machine-ip>"]
    for ip in ips:
        print("      http://%s:%d" % (ip, args.port))
    print("  Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
        httpd.shutdown()


if __name__ == "__main__":
    main()
