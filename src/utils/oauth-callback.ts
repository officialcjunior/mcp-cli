import { createServer } from 'node:http';
import { URL } from 'node:url';

/**
 * Starts a temporary HTTP server to receive the OAuth callback
 */
export async function waitForOAuthCallback(callbackPort: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      // Ignore favicon requests
      if (req.url === '/favicon.ico') {
        res.writeHead(404);
        res.end();
        return;
      }

      console.log(`📥 Received callback: ${req.url}`);
      const parsedUrl = new URL(req.url || '', 'http://localhost');
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');

      if (code) {
        console.log(`✅ Authorization code received: ${code?.substring(0, 10)}...`);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        resolve(code);
        setTimeout(() => server.close(), 3000);
      } else if (error) {
        console.log(`❌ Authorization error: ${error}`);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Authorization Failed</h1>
              <p>Error: ${error}</p>
            </body>
          </html>
        `);
        reject(new Error(`OAuth authorization failed: ${error}`));
      } else {
        console.log(`❌ No authorization code or error in callback`);
        res.writeHead(400);
        res.end('Bad request');
        reject(new Error('No authorization code provided'));
      }
    });

    server.listen(callbackPort, () => {
      console.log(`OAuth callback server started on http://localhost:${callbackPort}`);
    });

    // Add timeout to prevent hanging indefinitely
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timeout - no response received within 5 minutes'));
    }, 5 * 60 * 1000); // 5 minutes timeout
  });
} 