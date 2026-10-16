const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

// KASH_APP_DIR debe apuntar a la carpeta que contiene index.html.
// En este workspace, el valor predeterminado usa la última versión portable.
const defaultAppDir = path.join(__dirname, '../../KASH_v0.677_PORTABLE/App');

async function startAppServer() {
  const appDir = path.resolve(process.env.KASH_APP_DIR || defaultAppDir);
  try {
    await fs.access(path.join(appDir, 'index.html'));
    await fs.access(path.join(appDir, 'kash-i18n.js'));
  } catch {
    throw new Error(
      `No se encontró KA$H con selector de idioma en: ${appDir}. ` +
      'Definí KASH_APP_DIR con la ruta de la carpeta App del portable v0.677.',
    );
  }

  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };

  // Servidor de lectura local: sólo interfaz, sin sesiones ni proyectos personales.
  const server = http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(appDir, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(appDir, file);
      const type = mime[path.extname(file).toLowerCase()];
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !type) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve); // Puerto libre: evita conflictos con otros proyectos.
  });

  return {
    appDir,
    url: `http://127.0.0.1:${server.address().port}/index.html`,
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

module.exports = { startAppServer };
