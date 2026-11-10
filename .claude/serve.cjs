// Servidor estático mínimo para probar el juego en local (node .claude/serve.cjs [carpeta] [puerto]).
// Con carpeta sirve otra cosa, por ejemplo el zip armado para un portal: dist/crazygames 5180.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = process.argv[2] ? path.resolve(__dirname, '..', process.argv[2]) : path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const port = Number(process.argv[3] || process.env.PORT) || 5173;

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, url === '/' ? 'index.html' : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('http://localhost:' + port));
