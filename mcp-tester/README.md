# MCP Route Tester

A small installable **PWA** for exercising every route on the MakeICT
[MCP-Server](https://github.com/MakeICT/MCP-Server) from a phone on the same
WiFi — badge verification, the admin pages, the Wild Apricot RPCs, logs, badges,
everything. Handy for poking at a running server without a laptop, and for
manually reproducing the issues from the code review.

```
mcp-tester/
├── serve.py               # zero-dependency launcher + reverse proxy
├── index.html             # the app (mobile-first)
├── app.js                 # UI logic + the route catalog
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # service worker (installable / offline shell)
└── icons/                 # app icons
```

## Why a launcher instead of just hosting the HTML

A phone browser can't usefully call the MCP-Server directly from a page hosted
elsewhere:

- **Mixed content** — an `https://` page (e.g. GitHub Pages) is not allowed to
  `fetch()` a plain-`http://` LAN server.
- **CORS** — a cross-origin `fetch()` can't read the response unless the server
  sends `Access-Control-Allow-Origin`, which MCP-Server does not.
- **Cookies** — the admin/login routes are session-cookie based, which needs a
  same-origin relationship to work cleanly.

`serve.py` solves all three by serving the PWA **and** reverse-proxying its API
calls to the MCP-Server. The browser only ever talks to `serve.py` (one plain
HTTP origin), and the proxy forwards to whatever server address you type into
the app. Session cookies are rewritten so login round-trips normally.

## Usage

On any machine on the same WiFi as the MCP-Server (Python 3.7+, no `pip`):

```bash
python3 mcp-tester/serve.py
# → http://192.168.x.y:8080
```

It prints the LAN URLs. Open one on your phone, then **Add to Home Screen /
Install** when prompted. In **Settings**, enter the MCP-Server base URL *as the
launcher machine sees it*, e.g. `http://192.168.1.50:5000`, and Save.

Options:

```bash
python3 mcp-tester/serve.py --port 9000
python3 mcp-tester/serve.py --target http://192.168.1.50:5000   # optional default
```

The target is normally taken from the app at request time (the `X-MCP-Target`
header), so one launcher can point at different servers without restarting.
`--target` only sets a fallback.

## Using it

- **Routes** tab — the full catalog grouped by blueprint. Each card shows the
  method, path, and an auth tag (`open` / `login` / `admin`). Fill in any path
  params (and a request body for POST/PUT — sensible samples are prefilled) and
  tap **Send**. You get the status, timing, response headers, and a pretty-
  printed body. HTML responses are summarized (title + any flash messages)
  instead of dumping the whole page.
- **Custom** tab — arbitrary method/path/body for anything not in the catalog,
  plus a short history of recent calls.
- **Settings** tab — server URL, an optional pasted session cookie (to hit
  `admin`/`login` routes directly), and optional extra headers.

### Authenticating for admin routes

Two ways:

1. **Log in through the proxy.** Open the login page route; the session cookie
   the server sets is stored against the launcher origin and automatically sent
   on later requests. (`flask_user` login forms carry a CSRF token, so form
   login may need the token from the login page — the pasted-cookie route below
   is usually simpler.)
2. **Paste a cookie.** Log in from a desktop browser, copy the `session=…`
   cookie, and paste it into **Settings → Session cookie override**. The proxy
   attaches it to every request.

## Route catalog

Mirrors the server blueprints: client device API
(`/api/clients/<id>/verify/<nfc>`, `/deauthorize`), core pages, users
(`/api/users…`, `/admin/user…`, reset), groups, logs (`/api/logs/`), Wild
Apricot (`/rpc/wildapricot/pull|push`, `/api/wildapricot/users/<id>`), badges,
and client admin. Edit the `CATALOG` array in `app.js` to add or adjust routes
— no build step.

## Security note

This is a **LAN development tool**. The proxy will forward to any host the app
names and does not verify upstream TLS certificates (self-signed test servers
are common). Don't run it on an untrusted network or expose port 8080 publicly.
