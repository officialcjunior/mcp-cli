import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';

import { InMemoryOAuthClientProvider } from '../auth/oauth-provider.js';
import { openBrowser } from '../utils/browser.js';
import { waitForOAuthCallback } from '../utils/oauth-callback.js';

export type TransportType = 'streamable-http' | 'sse';

export interface ConnectionResult {
  client: Client;
  transport: StreamableHTTPClientTransport | SSEClientTransport;
  transportType: TransportType;
}

export class ConnectionManager {
  private oauthProvider: InMemoryOAuthClientProvider | null = null;

  constructor(
    private readonly callbackPort: number = 8090
  ) {}

  /**
   * Create OAuth provider with browser redirect handling
   */
  private createOAuthProvider(): InMemoryOAuthClientProvider {
    const callbackUrl = `http://localhost:${this.callbackPort}/callback`;
    
    const clientMetadata: OAuthClientMetadata = {
      client_name: 'MCP CLI Client',
      redirect_uris: [callbackUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      scope: 'mcp:tools'
    };

    return new InMemoryOAuthClientProvider(
      callbackUrl,
      clientMetadata,
      (redirectUrl: URL) => {
        console.log(`📌 OAuth redirect handler called - opening browser`);
        openBrowser(redirectUrl.toString());
      }
    );
  }

  /**
   * Attempt connection with Streamable HTTP transport and OAuth
   */
  private async attemptStreamableHttpConnection(baseUrl: URL): Promise<ConnectionResult> {
    console.log('🚢 Trying Streamable HTTP transport with OAuth...');

    const client = new Client({
      name: 'mcp-cli',
      version: '1.0.0'
    });

    client.onerror = (error) => {
      console.error('Client error:', error);
    };

    this.oauthProvider = this.createOAuthProvider();
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      authProvider: this.oauthProvider
    });

    try {
      console.log('🔌 Attempting connection (this may trigger OAuth redirect)...');
      await client.connect(transport);
      console.log('✅ Connected successfully with Streamable HTTP + OAuth');
      
      return {
        client,
        transport,
        transportType: 'streamable-http'
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        console.log('🔐 OAuth required - waiting for authorization...');
        const callbackPromise = waitForOAuthCallback(this.callbackPort);
        const authCode = await callbackPromise;
        await transport.finishAuth(authCode);
        console.log('🔐 Authorization completed, reconnecting...');
        
        // Retry connection after OAuth completion
        const retryClient = new Client({
          name: 'mcp-cli',
          version: '1.0.0'
        });
        const retryTransport = new StreamableHTTPClientTransport(baseUrl, {
          authProvider: this.oauthProvider
        });
        await retryClient.connect(retryTransport);
        
        return {
          client: retryClient,
          transport: retryTransport,
          transportType: 'streamable-http'
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Attempt connection with SSE transport (fallback)
   */
  private async attemptSSEConnection(baseUrl: URL): Promise<ConnectionResult> {
    console.log('📡 Falling back to SSE transport...');
    console.log('⚠️  Note: SSE transport may have limited OAuth support');

    const client = new Client({
      name: 'mcp-cli-sse',
      version: '1.0.0'
    });

    client.onerror = (error) => {
      console.error('SSE Client error:', error);
    };

    const transport = new SSEClientTransport(baseUrl);
    
    try {
      await client.connect(transport);
      console.log('✅ Connected using SSE transport');
      
      return {
        client,
        transport,
        transportType: 'sse'
      };
    } catch (error) {
      // Add more specific error handling
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw new Error(`Network error connecting to ${baseUrl}: ${error.message}`);
        } else if (error.message.includes('timeout')) {
          throw new Error(`Connection timeout to ${baseUrl}. Please check if the server is running.`);
        }
      }
      throw error;
    }
  }

  /**
   * Connect to MCP server with OAuth and transport fallback
   */
  async connect(serverUrl: string): Promise<ConnectionResult> {
    console.log(`🔗 Attempting to connect to ${serverUrl} with OAuth...`);
    
    const baseUrl = new URL(serverUrl);
    
    try {
      // Try Streamable HTTP with OAuth first
      return await this.attemptStreamableHttpConnection(baseUrl);
    } catch (streamableError) {
      console.log(`Streamable HTTP connection failed: ${streamableError}`);
      
      try {
        // Fall back to SSE transport
        return await this.attemptSSEConnection(baseUrl);
      } catch (sseError) {
        console.error(`Failed to connect with either transport method:`);
        console.error(`1. Streamable HTTP error: ${streamableError}`);
        console.error(`2. SSE error: ${sseError}`);
        
        // Provide helpful error messages
        if (String(streamableError).includes('ECONNREFUSED')) {
          throw new Error(`Cannot connect to server at ${serverUrl}. Please ensure the MCP server is running and accessible.`);
        } else if (String(streamableError).includes('timeout')) {
          throw new Error(`Connection timeout to ${serverUrl}. The server may be slow to respond or unreachable.`);
        } else {
          throw new Error(`Could not connect to server at ${serverUrl} with any available transport method.`);
        }
      }
    }
  }

  /**
   * Get OAuth provider (if available)
   */
  getOAuthProvider(): InMemoryOAuthClientProvider | null {
    return this.oauthProvider;
  }
} 