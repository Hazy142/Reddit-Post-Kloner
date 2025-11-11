import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
          port: 3000,
          host: '0.0.0.0',
          allowedHosts: true,
          proxy: {
            // Proxy für Reddit API - verwende old.reddit.com (öffentliche JSON-Endpunkte, keine OAuth nötig)
            '/api/reddit': {
              target: 'https://old.reddit.com',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api\/reddit/, ''),
              configure: (proxy, _options) => {
                proxy.on('proxyReq', (proxyReq, req, _res) => {
                  // Setze Browser-ähnliche Header für old.reddit.com (öffentliche JSON-Endpunkte)
                  proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
                  proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
                  proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
                  proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
                  proxyReq.setHeader('DNT', '1');
                  proxyReq.setHeader('Connection', 'keep-alive');
                  proxyReq.setHeader('Sec-Fetch-Dest', 'empty');
                  proxyReq.setHeader('Sec-Fetch-Mode', 'cors');
                  proxyReq.setHeader('Sec-Fetch-Site', 'same-origin');
                  proxyReq.setHeader('Cache-Control', 'no-cache');
                  
                  // Setze Referer auf Reddit
                  const targetPath = req.url.replace('/api/reddit', '');
                  const refererPath = targetPath.includes('/.json') 
                    ? targetPath.split('/.json')[0] 
                    : targetPath;
                  proxyReq.setHeader('Referer', `https://old.reddit.com${refererPath}`);
                  
                  // Entferne Proxy-Header
                  proxyReq.removeHeader('X-Forwarded-For');
                  proxyReq.removeHeader('X-Forwarded-Host');
                  proxyReq.removeHeader('X-Forwarded-Proto');
                  proxyReq.removeHeader('X-Real-IP');
                  
                  const targetUrl = req.url.replace('/api/reddit', '');
                  console.log(`[PROXY] ${req.method} ${req.url} -> https://old.reddit.com${targetUrl}`);
                });

                proxy.on('proxyRes', (proxyRes, req, res) => {
                  console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.url}`);
                  proxyRes.headers['access-control-allow-origin'] = '*';
                  proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
                  proxyRes.headers['access-control-allow-headers'] = '*';
                  
                  if (proxyRes.statusCode >= 400) {
                    console.error(`[PROXY] Error response ${proxyRes.statusCode} for ${req.url}`);
                  }
                });

                proxy.on('error', (err, req, res) => {
                  console.error('[PROXY] Proxy error:', err);
                });
              },
            },
            '/api/reddit-www': {
              target: 'https://www.reddit.com',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api\/reddit-www/, ''),
              configure: (proxy, _options) => {
                proxy.on('proxyReq', (proxyReq, req, _res) => {
                  proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                  proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
                  proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
                  proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
                  proxyReq.setHeader('DNT', '1');
                  proxyReq.setHeader('Connection', 'keep-alive');
                  proxyReq.setHeader('Sec-Fetch-Dest', 'empty');
                  proxyReq.setHeader('Sec-Fetch-Mode', 'cors');
                  proxyReq.setHeader('Sec-Fetch-Site', 'same-origin');
                  proxyReq.setHeader('Cache-Control', 'no-cache');
                  proxyReq.setHeader('Referer', 'https://www.reddit.com/');
                  proxyReq.setHeader('Origin', 'https://www.reddit.com');
                });
                proxy.on('proxyRes', (proxyRes, req, res) => {
                  proxyRes.headers['access-control-allow-origin'] = '*';
                  proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
                  proxyRes.headers['access-control-allow-headers'] = '*';
                });
                proxy.on('error', (err, req, res) => {
                  console.error('Proxy error:', err);
                });
              },
            },
            '/api/perplexity': {
              target: 'https://api.perplexity.ai',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api\/perplexity/, ''),
              configure: (proxy, _options) => {
                proxy.on('proxyReq', (proxyReq, req, _res) => {
                  // Setze erforderliche Header für Perplexity API
                  proxyReq.setHeader('Authorization', `Bearer ${env.PERPLEXITY_API_KEY}`);
                  
                  console.log(`[PROXY] Perplexity API: ${req.method} ${req.url}`);
                  console.log(`[PROXY] API Key configured: ${env.PERPLEXITY_API_KEY ? 'Yes (length: ' + (env.PERPLEXITY_API_KEY?.length || 0) + ')' : 'No'}`);
                });
                proxy.on('proxyRes', (proxyRes, req, res) => {
                  console.log(`[PROXY] Perplexity Response: ${proxyRes.statusCode} for ${req.url}`);
                  
                  // CORS Headers
                  proxyRes.headers['access-control-allow-origin'] = '*';
                  proxyRes.headers['access-control-allow-methods'] = 'POST, OPTIONS';
                  proxyRes.headers['access-control-allow-headers'] = '*';
                  
                  // Log error responses with body
                  if (proxyRes.statusCode >= 400) {
                    let body = '';
                    proxyRes.on('data', (chunk) => {
                      body += chunk.toString();
                    });
                    proxyRes.on('end', () => {
                      console.error(`[PROXY] Perplexity API error ${proxyRes.statusCode}:`, body);
                    });
                  }
                });
                proxy.on('error', (err, req, res) => {
                  console.error('[PROXY] Perplexity error:', err);
                });
              },
            },
          },
      },
      plugins: [react()],
      define: {
        'process.env.PERPLEXITY_API_KEY': JSON.stringify(env.PERPLEXITY_API_KEY),
        'process.env.REDDIT_CLIENT_ID': JSON.stringify(env.REDDIT_CLIENT_ID || 'K31ykUdjLyJ_m2ujQvLuTw'),
        'process.env.REDDIT_CLIENT_SECRET': JSON.stringify(env.REDDIT_CLIENT_SECRET || 'ekdVGrgS7coi6SmkEajpD2lKLTzl2w'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
