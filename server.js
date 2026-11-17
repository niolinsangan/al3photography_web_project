// AL3 Photography: tiny dependency-free server (Node 18+).
// Serves /public, stores content in DATA_DIR/content.json, images in DATA_DIR/uploads.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const PUBLIC = path.join(__dirname, 'public');
const UPLOADS = path.join(DATA_DIR, 'uploads');
const CONTENT = path.join(DATA_DIR, 'content.json');
const PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = crypto.createHash('sha256').update('al3|' + PASSWORD).digest();
const MAX_UPLOAD = 30 * 1024 * 1024, MAX_JSON = 2 * 1024 * 1024, SESSION_MS = 12 * 3600e3;

if (!PASSWORD || PASSWORD.length < 8) {
  console.error('Set ADMIN_PASSWORD (8+ characters) before starting.\n  e.g.  ADMIN_PASSWORD="my-long-password" node server.js');
  process.exit(1);
}
fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(CONTENT)) fs.copyFileSync(path.join(__dirname, 'seed.json'), CONTENT);

const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

// ---- sessions (signed cookie) ----
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const makeToken = () => { const exp = String(Date.now() + SESSION_MS); return exp + '.' + sign(exp); };
function isAuthed(req) {
  const m = /(?:^|;\s*)al3_session=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = Buffer.from(sign(exp)), got = Buffer.from(sig);
  return good.length === got.length && crypto.timingSafeEqual(good, got);
}
const attempts = new Map(); // ip -> {n, t}
function tooMany(ip) { const a = attempts.get(ip); return a && a.n >= 8 && Date.now() - a.t < 15 * 60e3; }
function noteFail(ip) { const a = attempts.get(ip); if (!a || Date.now() - a.t > 15 * 60e3) attempts.set(ip, { n: 1, t: Date.now() }); else a.n++; }

// ---- helpers ----
const send = (res, code, body, headers = {}) => {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
};
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function sniffImage(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8) return '.jpg';
  if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return '.png';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return '.webp';
  if (b.slice(0, 3).toString() === 'GIF') return '.gif';
  return null;
}
const str = (v, max) => String(v ?? '').slice(0, max);
const CATS = ['nature', 'wildlife', 'aerial', 'underwater', 'resorts', 'people', 'conservation'];
function clean(c) { // validate + trim the content object so the admin can't store junk
  const o = {
    hero: { image: str(c.hero?.image, 300), eyebrow: str(c.hero?.eyebrow, 120), title: str(c.hero?.title, 200), subtitle: str(c.hero?.subtitle, 600) },
    about: { image: str(c.about?.image, 300), name: str(c.about?.name, 100), role: str(c.about?.role, 100), years: str(c.about?.years, 40), bio: str(c.about?.bio, 2000), quote: str(c.about?.quote, 600) },
    gallery: (c.gallery || []).slice(0, 500).map((p, i) => ({ id: str(p.id || 'g' + Date.now() + i, 40), title: str(p.title, 120), category: CATS.includes(p.category) ? p.category : 'nature',
      image: str(p.image, 300), camera: str(p.camera, 80), lens: str(p.lens, 80), iso: str(p.iso, 40), shutter: str(p.shutter, 60) })),
    stories: (c.stories || []).slice(0, 200).map((s, i) => ({ id: str(s.id || 'story-' + Date.now() + i, 60).replace(/[^\w-]/g, '-'), title: str(s.title, 160), label: str(s.label, 80), tag: str(s.tag, 100),
      excerpt: str(s.excerpt, 600), readTime: str(s.readTime, 6), cover: str(s.cover, 300), body: str(s.body, 200000) })),
  };
  return o;
}

// ---- routes ----
async function handle(req, res) {
  const url = new URL(req.url, 'http://x'); const p = decodeURIComponent(url.pathname);
  const ip = req.socket.remoteAddress;

  if (p === '/api/content' && req.method === 'GET')
    return send(res, 200, fs.readFileSync(CONTENT), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });

  if (p === '/api/login' && req.method === 'POST') {
    if (tooMany(ip)) return send(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    let pw = ''; try { pw = JSON.parse((await readBody(req, 4096)).toString()).password || ''; } catch {}
    const a = crypto.createHash('sha256').update(pw).digest(), b = crypto.createHash('sha256').update(PASSWORD).digest();
    if (!crypto.timingSafeEqual(a, b)) { noteFail(ip); return send(res, 401, { error: 'Wrong password' }); }
    attempts.delete(ip);
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return send(res, 200, { ok: true }, { 'Set-Cookie': `al3_session=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure}` });
  }
  if (p === '/api/logout' && req.method === 'POST')
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'al3_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  if (p === '/api/session') return send(res, 200, { authed: isAuthed(req) });

  if (p === '/api/content' && req.method === 'PUT') {
    if (!isAuthed(req)) return send(res, 401, { error: 'Not logged in' });
    let data; try { data = JSON.parse((await readBody(req, MAX_JSON)).toString()); } catch { return send(res, 400, { error: 'Bad JSON' }); }
    const tmp = CONTENT + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(clean(data), null, 2)); fs.renameSync(tmp, CONTENT);
    return send(res, 200, { ok: true });
  }
  if (p === '/api/upload' && req.method === 'POST') {
    if (!isAuthed(req)) return send(res, 401, { error: 'Not logged in' });
    let buf; try { buf = await readBody(req, MAX_UPLOAD); } catch { return send(res, 413, { error: 'Image too large (30 MB max)' }); }
    const ext = sniffImage(buf); if (!ext) return send(res, 400, { error: 'Only JPG, PNG, WebP or GIF images' });
    const name = Date.now().toString(36) + crypto.randomBytes(4).toString('hex') + ext;
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return send(res, 200, { url: '/uploads/' + name });
  }
  if (p.startsWith('/api/')) return send(res, 404, { error: 'Not found' });

  // static files
  let file;
  if (p.startsWith('/uploads/')) file = path.join(UPLOADS, path.basename(p));
  else {
    const rel = p === '/' ? 'index.html' : p === '/admin' ? 'admin.html' : p.slice(1);
    file = path.join(PUBLIC, rel);
    if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    const ext = path.extname(file).toLowerCase();
    const cache = p.startsWith('/uploads/') ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}
http.createServer((req, res) => handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); }))
  .listen(PORT, () => console.log(`AL3 site running: http://localhost:${PORT}   admin: http://localhost:${PORT}/admin`));
