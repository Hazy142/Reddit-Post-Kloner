import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Reddit OAuth Credentials
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'K31ykUdjLyJ_m2ujQvLuTw';
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || 'ekdVGrgS7coi6SmkEajpD2lKLTzl2w';
const REDDIT_USER_AGENT = 'web:reddit-post-kloner:v1.0.0 (by /u/Ill_Comfortable8964)';

// Token Cache
let tokenCache = {
    token: null,
    expiresAt: 0,
};

// CORS für alle Routen aktivieren
app.use(cors());
app.use(express.json());

// Endpoint zum Abrufen des Reddit OAuth Tokens
app.get('/api/reddit-token', async (req, res) => {
    try {
        console.log('[TOKEN] Token-Anfrage erhalten');
        // Prüfe Cache
        if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
            console.log('[TOKEN] Verwende gecachten Token');
            return res.json({
                token: tokenCache.token,
                expires_in: Math.floor((tokenCache.expiresAt - Date.now()) / 1000),
            });
        }

        console.log('[TOKEN] Hole neuen Token von Reddit...');
        // Hole neuen Token
        const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
        
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': REDDIT_USER_AGENT,
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
            }),
        });

        console.log(`[TOKEN] Reddit Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[TOKEN] Reddit OAuth Error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Failed to get Reddit token', details: errorText });
        }

        const data = await response.json();
        
        if (!data.access_token) {
            console.error('[TOKEN] Kein access_token in der Antwort:', data);
            return res.status(500).json({ error: 'No access token in response', details: data });
        }
        
        // Cache den Token
        const expiresIn = (data.expires_in || 3600) * 1000;
        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + expiresIn - 60000, // 1 Minute vor Ablauf erneuern
        };

        console.log('[TOKEN] Reddit OAuth Token erfolgreich abgerufen und gecacht');
        res.json({
            token: data.access_token,
            expires_in: data.expires_in || 3600,
        });
    } catch (error) {
        console.error('[TOKEN] Error fetching Reddit token:', error);
        console.error('[TOKEN] Error stack:', error.stack);
        res.status(500).json({ error: 'Internal server error', message: error.message, stack: error.stack });
    }
});

// Proxy für Reddit API mit OAuth
app.use('/api/reddit', createProxyMiddleware({
  target: 'https://api.reddit.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/reddit': '', // Entferne /api/reddit vom Pfad
  },
  onProxyReq: async (proxyReq, req, res) => {
    try {
      // Hole OAuth Token
      if (!tokenCache.token || tokenCache.expiresAt <= Date.now()) {
        console.log('[OAUTH] Requesting new token...');
        const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': REDDIT_USER_AGENT,
          },
          body: new URLSearchParams({ grant_type: 'client_credentials' }),
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          tokenCache = {
            token: tokenData.access_token,
            expiresAt: Date.now() + ((tokenData.expires_in || 3600) * 1000) - 60000,
          };
          console.log('[OAUTH] Token erfolgreich abgerufen');
        } else {
          const errorText = await tokenResponse.text();
          console.error('[OAUTH] Token-Abruf fehlgeschlagen:', tokenResponse.status, errorText);
          // Setze trotzdem Header, auch ohne Token (kann fehlschlagen, aber wir versuchen es)
        }
      } else {
        console.log('[OAUTH] Verwende gecachten Token');
      }

      // Setze OAuth Token
      if (tokenCache.token) {
        proxyReq.setHeader('Authorization', `Bearer ${tokenCache.token}`);
      }

      // Setze Reddit API Header
      proxyReq.setHeader('User-Agent', REDDIT_USER_AGENT);
      proxyReq.setHeader('Accept', 'application/json');
      
      // Logge die vollständige URL
      const targetUrl = `https://api.reddit.com${req.url.replace('/api/reddit', '')}`;
      console.log(`[PROXY] ${req.method} ${req.url} -> ${targetUrl}${tokenCache.token ? ' (with OAuth)' : ' (NO TOKEN!)'}`);
    } catch (error) {
      console.error('[PROXY] Error in proxy request:', error);
      // Setze trotzdem Header, auch bei Fehler
      proxyReq.setHeader('User-Agent', REDDIT_USER_AGENT);
      proxyReq.setHeader('Accept', 'application/json');
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.url}`);
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = '*';
    
    // Logge Fehler-Responses
    if (proxyRes.statusCode >= 400) {
      console.error(`[PROXY] Error response ${proxyRes.statusCode} for ${req.url}`);
    }
  },
  onError: (err, req, res) => {
    console.error('[PROXY] Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  },
}));

// Proxy für www.reddit.com
app.use('/api/reddit-www', createProxyMiddleware({
  target: 'https://www.reddit.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/reddit-www': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying: ${req.url} -> https://www.reddit.com${req.url.replace('/api/reddit-www', '')}`);
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    proxyReq.setHeader('Accept', 'application/json');
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response: ${proxyRes.statusCode} for ${req.url}`);
    proxyRes.headers['access-control-allow-origin'] = '*';
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  },
}));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Proxy server running on http://0.0.0.0:${PORT}`);
  console.log(`[SERVER] Accessible from: http://localhost:${PORT}`);
  console.log(`[SERVER] Reddit Client ID: ${REDDIT_CLIENT_ID.substring(0, 10)}...`);
  console.log('[SERVER] Server is ready to proxy Reddit API requests with OAuth');
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

