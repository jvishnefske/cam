/* MCP Route Tester — client logic + route catalog.
 *
 * All requests are sent to the SAME origin the PWA is served from, under the
 * "/__mcp/" prefix, with an "X-MCP-Target" header naming the real MCP-Server.
 * The bundled launcher (serve.py) forwards them on and streams the reply back,
 * so the browser never makes a cross-origin or mixed-content request and
 * session cookies round-trip normally.
 */

const LS = {
  base: 'mcp.base', cookie: 'mcp.cookie', headers: 'mcp.headers'
};
const cfg = {
  base: localStorage.getItem(LS.base) || '',
  cookie: localStorage.getItem(LS.cookie) || '',
  headers: localStorage.getItem(LS.headers) || ''
};

/* ---- Route catalog (derived from the MCP-Server blueprints) --------------- */
// auth: 'open' | 'login' | 'admin'   — informational, shown as a tag.
// params: path placeholders {name}; body: default JSON/text for POST/PUT.
const CATALOG = [
  { group: 'Client API — device endpoints (unauthenticated)', routes: [
    { m:'GET',  p:'/api/clients/{client_id}/verify/{nfc_id}', auth:'open',
      params:{ client_id:'1', nfc_id:'04a1b2c3d4e5f6' },
      note:'The core badge check. Returns {"authorized":"true|false"}.' },
    { m:'GET',  p:'/api/clients/{client_id}/deauthorize', auth:'open',
      params:{ client_id:'1' },
      note:'Called by the reader when power is lost.' },
  ]},
  { group: 'Core', routes: [
    { m:'GET', p:'/',      auth:'open',  note:'Redirects to /admin or /login.' },
    { m:'GET', p:'/about', auth:'open' },
    { m:'GET', p:'/admin', auth:'admin', note:'Admin dashboard (HTML).' },
  ]},
  { group: 'Users', routes: [
    { m:'GET', p:'/api/users',                       auth:'login' },
    { m:'GET', p:'/api/users/{user_id}',             auth:'login', params:{ user_id:'1' } },
    { m:'PUT', p:'/api/users/{user_id}',             auth:'login', params:{ user_id:'1' },
      body:'{\n  "first_name": "Test"\n}', note:'Endpoint is stubbed server-side.' },
    { m:'GET', p:'/api/users/{user_id}/notifications?since=0', auth:'login', params:{ user_id:'1' } },
    { m:'GET', p:'/admin/users',                     auth:'admin' },
    { m:'POST',p:'/admin/users',                     auth:'admin',
      body:'query=', form:true, note:'Search form; body is form-encoded "query=<terms>".' },
    { m:'GET', p:'/admin/user/{user_id}',            auth:'admin', params:{ user_id:'1' } },
    { m:'GET', p:'/account',                         auth:'login' },
    { m:'GET', p:'/register',                        auth:'open' },
    { m:'GET', p:'/login',                           auth:'open' },
    { m:'GET', p:'/logout',                          auth:'open' },
    { m:'POST',p:'/reset_password',                  auth:'open',
      body:'email=', form:true, note:'Reset request form (email=<addr>).' },
  ]},
  { group: 'Groups', routes: [
    { m:'GET', p:'/api/groups',                auth:'login' },
    { m:'GET', p:'/api/groups/{group_id}',     auth:'login', params:{ group_id:'1' } },
    { m:'GET', p:'/admin/groups',              auth:'admin' },
    { m:'GET', p:'/admin/group/new',           auth:'admin' },
    { m:'GET', p:'/admin/group/{group_id}',    auth:'admin', params:{ group_id:'1' } },
    { m:'GET', p:'/admin/group/delete/{group_id}', auth:'admin', params:{ group_id:'1' },
      note:'Deletes the group (GET, no confirmation).' },
  ]},
  { group: 'Logs', routes: [
    { m:'GET', p:'/admin/logs', auth:'admin' },
    { m:'POST',p:'/api/logs/',  auth:'open',
      body:'{\n  "log_level": "INFO",\n  "log_type": "Client",\n  "event_type": "Test",\n  "details": "hello from MCP Tester"\n}',
      note:'Create a log entry.' },
  ]},
  { group: 'Wild Apricot', routes: [
    { m:'GET', p:'/admin/wildapricot',                 auth:'admin' },
    { m:'POST',p:'/rpc/wildapricot/pull',              auth:'open',
      body:'{\n  "updated_since": 1\n}', note:'Queues a pull task (days back).' },
    { m:'POST',p:'/rpc/wildapricot/push',              auth:'open',
      body:'{\n  "user_ids": [1]\n}', note:'Queues a push task.' },
    { m:'GET', p:'/api/wildapricot/users/{user_id}',   auth:'open', params:{ user_id:'1' } },
  ]},
  { group: 'Badges', routes: [
    { m:'GET', p:'/admin/badges',            auth:'admin' },
    { m:'GET', p:'/api/user/{user_id}/badge',auth:'open', params:{ user_id:'1' },
      note:'Returns {"svg": "..."}.' },
  ]},
  { group: 'Clients (admin)', routes: [
    { m:'GET', p:'/admin/clients',                   auth:'admin' },
    { m:'GET', p:'/admin/client/{client_id}',        auth:'admin', params:{ client_id:'1' } },
    { m:'GET', p:'/admin/client/delete/{client_id}', auth:'admin', params:{ client_id:'1' },
      note:'Deletes the client (GET, no confirmation).' },
  ]},
];

/* ---- helpers -------------------------------------------------------------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const el = (t, props={}, kids=[]) => {
  const n = document.createElement(t);
  for (const [k,v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(kids)) if (c) n.append(c);
  return n;
};

function setDot(state) {
  const d = $('#statusDot');
  d.className = 'dot' + (state ? ' ' + state : '');
}

function fillPath(tpl, values) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(values[k] ?? `{${k}}`));
}

function extraHeaders() {
  if (!cfg.headers.trim()) return {};
  try { return JSON.parse(cfg.headers); } catch { return {}; }
}

/* Core request: relay through the launcher on the same origin. */
async function send(method, path, { body=null, form=false } = {}) {
  if (!cfg.base) throw new Error('No server base URL set (Settings).');
  const headers = { 'X-MCP-Target': cfg.base, ...extraHeaders() };
  if (cfg.cookie.trim()) headers['X-MCP-Cookie'] = cfg.cookie.trim();
  const opts = { method, headers, credentials: 'same-origin' };
  if (body != null && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = form
      ? 'application/x-www-form-urlencoded'
      : 'application/json';
    opts.body = body;
  }
  const url = '/__mcp/' + path.replace(/^\//, '');
  const t0 = performance.now();
  const res = await fetch(url, opts);
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  return { status: res.status, ms, text, headers: res.headers,
           ctype: res.headers.get('content-type') || '' };
}

function prettyBody(text, ctype) {
  if (/json/i.test(ctype)) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch {}
  }
  if (/html/i.test(ctype)) {
    const title = (text.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    const flash = [...text.matchAll(/class="[^"]*(?:flash|alert)[^"]*"[^>]*>([\s\S]*?)</gi)]
      .map(m => m[1].trim()).filter(Boolean);
    const head = title ? `<!-- HTML page: ${title.trim()} -->\n` : '';
    const fl = flash.length ? `<!-- messages: ${flash.join(' | ')} -->\n` : '';
    return head + fl + text.slice(0, 4000) + (text.length > 4000 ? '\n… (truncated)' : '');
  }
  return text;
}

function renderResp(container, r) {
  const cls = 's' + String(r.status)[0];
  const hdrLines = [...r.headers.entries()]
    .filter(([k]) => !/^content-security|^x-frame|^x-mcp/i.test(k))
    .map(([k,v]) => `${k}: ${v}`).join('\n');
  container.innerHTML = '';
  container.append(
    el('div', { class: 'resp' }, [
      el('div', { class: 'meta' }, [
        el('span', { class: 'status ' + cls, text: r.status || 'ERR' }),
        el('span', { class: 'hdrs', text: r.ms + ' ms · ' + (r.ctype.split(';')[0] || '—') }),
      ]),
      el('details', {}, [
        el('summary', { class: 'hdrs', style: 'padding:6px 10px; cursor:pointer', text: 'response headers' }),
        el('pre', { class: 'hdrs', text: hdrLines || '(none)' }),
      ]),
      el('pre', { text: prettyBody(r.text, r.ctype) }),
    ])
  );
}

/* ---- render route list ---------------------------------------------------- */
const HIST = [];
function pushHistory(method, path, r) {
  HIST.unshift({ method, path, status: r.status, ms: r.ms, t: new Date() });
  HIST.length = Math.min(HIST.length, 20);
  const h = $('#history'); if (!h) return;
  h.innerHTML = '';
  for (const e of HIST) {
    const cls = 's' + String(e.status)[0];
    h.append(el('div', { class: 'meta', style: 'border:1px solid var(--line); border-radius:8px; margin:6px 0' }, [
      el('span', { class: 'chip m-' + e.method, text: e.method }),
      el('span', { class: 'path', text: e.path }),
      el('span', { class: 'status ' + cls, style: 'margin-left:auto', text: e.status }),
    ]));
  }
}

function routeCard(rt) {
  const params = rt.params || {};
  const inputs = {};
  const summary = el('summary', {}, [
    el('span', { class: 'chip m-' + rt.m, text: rt.m }),
    el('span', { class: 'path', text: rt.p }),
    el('span', { class: 'authtag ' + rt.auth, text: rt.auth }),
  ]);
  const bodyBox = el('div', { class: 'body' });

  if (rt.note) bodyBox.append(el('div', { class: 'hint', text: rt.note }));

  for (const [name, def] of Object.entries(params)) {
    const inp = el('input', { value: def, spellcheck: 'false', autocapitalize: 'off' });
    inputs[name] = inp;
    bodyBox.append(el('label', { class: 'lbl', text: name }), inp);
  }

  let bodyInput = null;
  if (rt.m === 'POST' || rt.m === 'PUT') {
    bodyInput = el('textarea', { spellcheck: 'false' });
    bodyInput.value = rt.body || (rt.form ? '' : '{}');
    bodyBox.append(el('label', { class: 'lbl', text: rt.form ? 'Body (form-encoded)' : 'Body (JSON)' }), bodyInput);
  }

  const respBox = el('div');
  const btn = el('button', { class: 'primary', text: 'Send' });
  btn.addEventListener('click', async () => {
    const vals = {};
    for (const k of Object.keys(inputs)) vals[k] = inputs[k].value;
    const path = fillPath(rt.p, vals);
    btn.disabled = true; btn.textContent = 'Sending…'; setDot('busy');
    try {
      const r = await send(rt.m, path, { body: bodyInput ? bodyInput.value : null, form: !!rt.form });
      renderResp(respBox, r);
      pushHistory(rt.m, path, r);
      setDot(r.status >= 200 && r.status < 400 ? 'ok' : 'err');
    } catch (e) {
      respBox.innerHTML = '';
      respBox.append(el('div', { class: 'resp' }, el('pre', { class: 's5', text: 'Request failed: ' + e.message })));
      setDot('err');
    } finally {
      btn.disabled = false; btn.textContent = 'Send';
    }
  });
  bodyBox.append(el('div', { class: 'row', style: 'margin-top:8px' }, btn), respBox);

  return el('details', { class: 'card' }, [summary, bodyBox]);
}

function renderRoutes() {
  const list = $('#routeList');
  list.innerHTML = '';
  for (const g of CATALOG) {
    list.append(el('p', { class: 'grp-title', text: g.group }));
    for (const rt of g.routes) list.append(routeCard(rt));
  }
  $('#noServer').classList.toggle('hidden', !!cfg.base);
}

/* ---- views / nav ---------------------------------------------------------- */
function showView(name) {
  for (const v of ['routes', 'custom', 'settings'])
    $('#view-' + v).classList.toggle('hidden', v !== name);
  for (const b of $$('.tabbar button'))
    b.classList.toggle('primary', b.dataset.view === name);
}

function loadSettingsForm() {
  $('#baseUrl').value = cfg.base;
  $('#cookie').value = cfg.cookie;
  $('#headers').value = cfg.headers;
  $('#targetLabel').textContent = cfg.base || 'no server set';
}

/* ---- ping ----------------------------------------------------------------- */
async function ping() {
  if (!cfg.base) { showView('settings'); return; }
  setDot('busy');
  try {
    const r = await send('GET', '/about');
    setDot(r.status < 500 ? 'ok' : 'err');
    $('#targetLabel').textContent = cfg.base + '  ·  ' + r.status + ' (' + r.ms + 'ms)';
  } catch (e) {
    setDot('err');
    $('#targetLabel').textContent = cfg.base + '  ·  unreachable';
  }
}

/* ---- wire up -------------------------------------------------------------- */
$('#btnSave').addEventListener('click', () => {
  cfg.base = $('#baseUrl').value.trim().replace(/\/+$/, '');
  cfg.cookie = $('#cookie').value.trim();
  cfg.headers = $('#headers').value.trim();
  localStorage.setItem(LS.base, cfg.base);
  localStorage.setItem(LS.cookie, cfg.cookie);
  localStorage.setItem(LS.headers, cfg.headers);
  loadSettingsForm();
  renderRoutes();
  showView('routes');
  ping();
});

$('#btnPing').addEventListener('click', ping);
$('#cSend').addEventListener('click', async () => {
  const method = $('#cMethod').value;
  const path = $('#cPath').value.trim();
  if (!path) return;
  const form = $('#cForm').checked;
  const body = (method === 'POST' || method === 'PUT') ? $('#cBody').value : null;
  setDot('busy');
  try {
    const r = await send(method, path, { body, form });
    renderResp($('#cResp'), r);
    pushHistory(method, path, r);
    setDot(r.status >= 200 && r.status < 400 ? 'ok' : 'err');
  } catch (e) {
    $('#cResp').innerHTML = '';
    $('#cResp').append(el('div', { class: 'resp' }, el('pre', { class: 's5', text: e.message })));
    setDot('err');
  }
});

for (const b of $$('.tabbar button'))
  b.addEventListener('click', () => showView(b.dataset.view));

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
$('#btnInstallHint').addEventListener('click', async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
  else $('#installHint').textContent =
    'Use your browser menu → "Add to Home screen" / "Install app".';
});

/* init */
loadSettingsForm();
renderRoutes();
showView(cfg.base ? 'routes' : 'settings');
if (cfg.base) ping();
if ('serviceWorker' in navigator)
  navigator.serviceWorker.register('./sw.js').catch(() => {});
