import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';

import { InMemoryOAuthClientProvider } from '../auth/oauth-provider.js';
import { TransportType, ConnectionResult, OAuthHandler } from './types.js';

export interface ConnectionManagerConfig {
  callbackPort?: number;
  oauthMetadata?: OAuthClientMetadata;
  transportPriority?: TransportType[];
  connectionTimeout?: number;
  oauthHandler?: OAuthHandler;
}

export class ConnectionManager extends EventEmitter {
  private oauthProvider: InMemoryOAuthClientProvider | null = null;
  private config: ConnectionManagerConfig & { 
    callbackPort: number;
    oauthMetadata: OAuthClientMetadata;
    transportPriority: TransportType[];
    connectionTimeout: number;
  };

  constructor(config: ConnectionManagerConfig = {}) {
    super();
    
    // Set defaults
    this.config = {
      callbackPort: config.callbackPort ?? 8090,
      oauthMetadata: config.oauthMetadata ?? {
        client_name: 'MCP CLI Client',
        redirect_uris: [`http://localhost:${config.callbackPort ?? 8090}/callback`],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
        scope: 'mcp:tools'
      },
      transportPriority: config.transportPriority ?? ['streamable-http', 'sse'],
      connectionTimeout: config.connectionTimeout ?? 30000,
      oauthHandler: config.oauthHandler
    };

    // Update redirect URI in metadata if callbackPort was provided
    if (config.callbackPort && !config.oauthMetadata) {
      this.config.oauthMetadata.redirect_uris = [`http://localhost:${config.callbackPort}/callback`];
    }
  }

  /**
   * Create OAuth provider with configurable redirect handling
   */
  private createOAuthProvider(): InMemoryOAuthClientProvider {
    const callbackUrl = `http://localhost:${this.config.callbackPort}/callback`;
    
    return new InMemoryOAuthClientProvider(
      callbackUrl,
      this.config.oauthMetadata,
      (redirectUrl: URL) => {
        this.emit('oauth-redirect', redirectUrl.toString());
        if (this.config.oauthHandler) {
          this.config.oauthHandler.handleRedirect(redirectUrl.toString());
        }
      }
    );
  }

  /**
   * Attempt connection with Streamable HTTP transport and OAuth
   */
  private async attemptStreamableHttpConnection(baseUrl: URL): Promise<ConnectionResult> {
    this.emit('connection-attempt', 'streamable-http');

    const client = new Client({
      name: 'mcp-cli',
      version: '1.0.0'
    });

    client.onerror = (error) => {
      this.emit('error', error);
    };

    this.oauthProvider = this.createOAuthProvider();
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      authProvider: this.oauthProvider
    });

    try {
      await client.connect(transport);
      
      return {
        client,
        transport,
        transportType: 'streamable-http'
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        // OAuth required
        if (!this.config.oauthHandler) {
          throw new Error('OAuth required but no OAuth handler provided');
        }
        
        const authCode = await this.config.oauthHandler.waitForCallback();
        this.emit('oauth-callback-received', authCode);
        
        await transport.finishAuth(authCode);
        
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
        this.emit('connection-failed', 'streamable-http', error as Error);
        throw error;
      }
    }
  }

  /**
   * Attempt connection with SSE transport (fallback)
   */
  private async attemptSSEConnection(baseUrl: URL): Promise<ConnectionResult> {
    this.emit('connection-attempt', 'sse');

    const client = new Client({
      name: 'mcp-cli-sse',
      version: '1.0.0'
    });

    client.onerror = (error) => {
      this.emit('error', error);
    };

    const transport = new SSEClientTransport(baseUrl);
    
    try {
      await client.connect(transport);
      
      return {
        client,
        transport,
        transportType: 'sse'
      };
    } catch (error) {
      this.emit('connection-failed', 'sse', error as Error);
      
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
    const baseUrl = new URL(serverUrl);
    
    for (const transportType of this.config.transportPriority) {
      try {
        let result: ConnectionResult;
        
        if (transportType === 'streamable-http') {
          result = await this.attemptStreamableHttpConnection(baseUrl);
        } else {
          result = await this.attemptSSEConnection(baseUrl);
        }
        
        this.emit('connected', result.transportType);
        return result;
      } catch (error) {
        // Continue to next transport type
        continue;
      }
    }
    
    // If we get here, all transports failed
    const error = new Error(`Could not connect to server at ${serverUrl} with any available transport method.`);
    this.emit('error', error);
    throw error;
  }

  /**
   * Get OAuth provider (if available)
   */
  getOAuthProvider(): InMemoryOAuthClientProvider | null {
    return this.oauthProvider;
  }
} 