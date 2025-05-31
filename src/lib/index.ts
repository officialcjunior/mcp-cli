// Main client class
export { MCPClient } from './mcp-client.js';

// OAuth handlers
export { BrowserOAuthHandler, CustomOAuthHandler } from './oauth-handlers.js';

// Connection manager (for advanced usage)
export { ConnectionManager } from './connection-manager.js';
export type { ConnectionManagerConfig } from './connection-manager.js';

// Types and interfaces
export type {
  MCPClientConfig,
  OAuthHandler,
  TransportType,
  ToolDetails,
  ConnectionResult
} from './types.js';

// Re-export useful types from the SDK
export type { Tool } from '@modelcontextprotocol/sdk/types.js';
export type { OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'; 