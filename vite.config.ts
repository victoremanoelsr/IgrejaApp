import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'http';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabaseFetch = async (path: string) => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    return response.json();
  };

  const parseParams = (req: IncomingMessage) => {
    const rawUrl = req.url || '';
    const qIdx = rawUrl.indexOf('?');
    return new URLSearchParams(qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '');
  };

  const jsonResponse = (res: ServerResponse, data: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify(data));
  };

  const memberApiPlugin = {
    name: 'member-api',
    configureServer(server: any) {
      // GET /api/member-certificates?church_id=...&member_id=...
      // Returns only BATISMO and APRESENTACAO (permanent certificates)
      server.middlewares.use(
        '/api/member-certificates',
        async (req: IncomingMessage, res: ServerResponse) => {
          const params = parseParams(req);
          const churchId = params.get('church_id') || '';
          const memberId = params.get('member_id') || '';

          if (!churchId || !memberId) { jsonResponse(res, []); return; }

          try {
            const data = await supabaseFetch(
              `letter_history?church_id=eq.${encodeURIComponent(churchId)}` +
              `&member_id=eq.${encodeURIComponent(memberId)}` +
              `&letter_type=in.(BATISMO,APRESENTACAO)` +
              `&order=issued_at.desc`
            );
            console.log(`[api/member-certificates] returned ${Array.isArray(data) ? data.length : 0} records`);
            jsonResponse(res, Array.isArray(data) ? data : []);
          } catch (e) {
            console.error('[api/member-certificates] error:', e);
            jsonResponse(res, []);
          }
        }
      );

      // GET /api/member-cert-template?church_id=...&letter_type=...
      // Returns the best matching LetterTemplate + church info for PDF regeneration
      server.middlewares.use(
        '/api/member-cert-template',
        async (req: IncomingMessage, res: ServerResponse) => {
          const params = parseParams(req);
          const churchId = params.get('church_id') || '';
          const letterType = params.get('letter_type') || '';

          if (!churchId || !letterType) { jsonResponse(res, { template: null, church: null }); return; }

          try {
            const [templates, churches] = await Promise.all([
              supabaseFetch(
                `letter_templates?church_id=eq.${encodeURIComponent(churchId)}` +
                `&type=in.(${encodeURIComponent(letterType)},GENERICO)` +
                `&order=created_at.desc`
              ),
              supabaseFetch(
                `churches?id=eq.${encodeURIComponent(churchId)}&select=id,name,address,pastor_name,logo_url`
              ),
            ]);

            const templateList = Array.isArray(templates) ? templates : [];
            const template = templateList.find((t: any) => t.type === letterType) ||
                             templateList.find((t: any) => t.type === 'GENERICO') ||
                             null;

            const church = Array.isArray(churches) && churches.length > 0 ? churches[0] : null;

            console.log(`[api/member-cert-template] type=${letterType} template=${template?.id || 'none'} church=${church?.name || 'none'}`);
            jsonResponse(res, { template, church });
          } catch (e) {
            console.error('[api/member-cert-template] error:', e);
            jsonResponse(res, { template: null, church: null });
          }
        }
      );
    },
  };

  return {
    plugins: [
      react(),
      memberApiPlugin,
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'IgrejaApp - Gestão Eclesiástica',
          short_name: 'IgrejaApp',
          description: 'Sistema completo de gestão eclesiástica com controle financeiro, membresia e relatórios.',
          theme_color: '#f97316',
          background_color: '#f9fafb',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }: { request: Request }) =>
                request.mode === 'navigate',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-navigation-cache',
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-get-cache',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'tailwindcss-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/esm\.sh\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'esm-cdn-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'charts': ['recharts'],
            'pdf': ['jspdf', 'jspdf-autotable'],
            'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'ui': ['lucide-react', 'react-draggable'],
          }
        }
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});
