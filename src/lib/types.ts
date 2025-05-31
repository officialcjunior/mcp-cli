import { OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export type TransportType = 'streamable-http' | 'sse';

export interface MCPClientConfig {
  callbackPort?: number;
  oauthMetadata?: OAuthClientMetadata;
  transportPriority?: TransportType[];
  connectionTimeout?: number;
  oauthHandler?: OAuthHandler;
}

export interface OAuthHandler {
  handleRedirect(url: string): Promise<void>;
  waitForCallback(): Promise<string>;
}

export interface MCPClientEvents {
  'connected': (transport: TransportType) => void;
  'disconnected': () => void;
  'notification': (notification: any) => void;
  'error': (error: Error) => void;
  'oauth-redirect': (url: string) => void;
  'oauth-callback-received': (code: string) => void;
  'connection-attempt': (transport: TransportType) => void;
  'connection-failed': (transport: TransportType, error: Error) => void;
}

export interface ToolDetails {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface ConnectionResult {
  client: any;
  transport: any;
  transportType: TransportType;
} 