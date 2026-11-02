import dotenv from 'dotenv'
dotenv.config()

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import fs from 'fs';
import path from 'path';

function vercelApiPlugin() {
  return {
    name: 'vercel-api-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        req.query = Object.fromEntries(urlObj.searchParams.entries());

        let routeName = urlObj.pathname.replace('/api/', '').split('?')[0].replace(/\/$/, '');
        let relativePath = `api/${routeName}.js`;
        let fullPath = path.resolve(process.cwd(), relativePath);
        let modulePath = `/${relativePath}`;

        const syncErrorRetryMatch = req.url.match(/^\/api\/sync-errors\/([^/]+)\/retry/);
        if (syncErrorRetryMatch) {
          req.params = { id: syncErrorRetryMatch[1] };
          req.query.id = syncErrorRetryMatch[1];
          req.query.view = 'errors';
          req.query.action = 'retry';
          modulePath = '/api/sync.js';
          fullPath = path.resolve(process.cwd(), 'api/sync.js');
        } else if (routeName === 'hubspot-health' || routeName === 'hubspot-owners' || routeName === 'hubspot-properties') {
          req.query.type = routeName.replace('hubspot-', '');
          modulePath = '/api/hubspot.js';
          fullPath = path.resolve(process.cwd(), 'api/hubspot.js');
        } else if (routeName === 'sync-activity') {
          req.query.view = 'activity';
          modulePath = '/api/sync.js';
          fullPath = path.resolve(process.cwd(), 'api/sync.js');
        } else if (routeName === 'sync-errors' || routeName === 'error-logs' || routeName === 'retry-sync-error') {
          req.query.view = 'errors';
          modulePath = '/api/sync.js';
          fullPath = path.resolve(process.cwd(), 'api/sync.js');
        } else if (routeName === 'cron-auto-retry') {
          req.query.view = 'cron';
          modulePath = '/api/sync.js';
          fullPath = path.resolve(process.cwd(), 'api/sync.js');
        } else if (routeName === 'create-contact') {
          modulePath = '/api/contacts.js';
          fullPath = path.resolve(process.cwd(), 'api/contacts.js');
        } else if (routeName === 'create-company') {
          modulePath = '/api/companies.js';
          fullPath = path.resolve(process.cwd(), 'api/companies.js');
        } else if (routeName === 'create-deal') {
          modulePath = '/api/deals.js';
          fullPath = path.resolve(process.cwd(), 'api/deals.js');
        }

        if (!fs.existsSync(fullPath)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: `API route not found: /api/${routeName}` }));
        }

        try {
          const mod = await server.ssrLoadModule(modulePath);
          const handler = mod.default;

          const runHandler = async () => {
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };

            await handler(req, res);
          };

          if (req.method === 'GET' || req.method === 'HEAD' || req.readableEnded) {
            req.body = {};
            await runHandler();
          } else {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch {
                req.body = {};
              }
              await runHandler();
            });
          }
        } catch (err) {
          console.error(`🔥 [Vite API Plugin] Error in ${modulePath}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Internal Server Error in ${modulePath}: ${err.message}` }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiPlugin()],
})
