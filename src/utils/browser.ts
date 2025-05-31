import { exec } from 'node:child_process';

/**
 * Opens the authorization URL in the user's default browser
 */
export async function openBrowser(url: string): Promise<void> {
  console.log(`🌐 Opening browser for authorization: ${url}`);

  const command = process.platform === 'win32' ? `start "${url}"` : 
                 process.platform === 'darwin' ? `open "${url}"` : 
                 `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`);
      console.log(`Please manually open: ${url}`);
    }
  });
} 