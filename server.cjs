// Simple static server that injects runtime environment variables into index.html
// This allows HuggingFace Spaces secrets to be available to the frontend at runtime.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 7860;
const DIST = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mjs': 'application/javascript',
};

// Build the env injection script
function getEnvScript() {
  const env = {};
  if (process.env.VITE_HF_TOKEN) {
    env.VITE_HF_TOKEN = process.env.VITE_HF_TOKEN;
  }
  return `<script>window.__ENV__=${JSON.stringify(env)};</script>`;
}

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);

  // SPA fallback: if file doesn't exist, serve index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    let content = fs.readFileSync(filePath);

    // Inject env vars into index.html
    if (filePath.endsWith('index.html')) {
      const html = content.toString();
      content = html.replace('<head>', `<head>\n    ${getEnvScript()}`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SpeakEasy server running on http://0.0.0.0:${PORT}`);
  console.log(`VITE_HF_TOKEN: ${process.env.VITE_HF_TOKEN ? 'configured ✓' : 'NOT SET ✗'}`);
});
