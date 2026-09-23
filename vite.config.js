import dotenv from 'dotenv'
dotenv.config()

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

function vercelApiPlugin() {
  return {
    name: 'vercel-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        let routeName = req.url.split('?')[0].replace('/api/', '');
        let modulePath = `/api/${routeName}.js`;

        // Check for parameterized route /api/sync-errors/:id/retry
        const syncErrorRetryMatch = req.url.match(/^\/api\/sync-errors\/([^/]+)\/retry/);
        if (syncErrorRetryMatch) {
          req.params = { id: syncErrorRetryMatch[1] };
          modulePath = '/api/retry-sync-error.js';
        }

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;

          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch {
              req.body = {};
            }

            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };

            await handler(req, res);
          });
        } catch {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `API route not found: ${modulePath}` }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiPlugin()],
})