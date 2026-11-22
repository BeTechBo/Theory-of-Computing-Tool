import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development, serve /api/llm from the same handler Vercel runs in production.
// Server-only secrets (GEMINI_API_KEY) are read from .env and never sent to the browser:
// only variables starting with VITE_ are exposed to client code.
function apiDevServer() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/llm', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/llm.js');
          return await mod.default(req, res);
        } catch (e) {
          // A broken API file should not take the whole dev server down
          server.config.logger.error(`[api] ${e.stack || e}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'The AI helper crashed on the server. Check the terminal.' }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [react(), apiDevServer()],
    server: {
      port: 3000
    }
  };
});
