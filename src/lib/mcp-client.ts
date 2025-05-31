import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Tool, CallToolResultSchema, ListToolsResultSchema, LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

import { ConnectionManager, ConnectionManagerConfig } from './connection-manager.js';
import { TransportType, MCPClientConfig, ToolDetails } from './types.js';
import { BrowserOAuthHandler } from './oauth-handlers.js';

/**
 * Main MCP Client class that provides a clean library interface
 * This class abstracts away the complexity of connection management and provides
 * a simple event-driven API for interacting with MCP servers
 */
export class MCPClient extends EventEmitter {
  private connectionManager: ConnectionManager;
  private client: Client | null = null;
  private transport: any = null;
  private transportType: TransportType | null = null;
  private isConnected: boolean = false;

  constructor(config: MCPClientConfig = {}) {
    super();

    // Set up default OAuth handler if none provided
    const connectionConfig: ConnectionManagerConfig = {
      ...config,
      oauthHandler: config.oauthHandler || new BrowserOAuthHandler(config.callbackPort)
    };

    this.connectionManager = new ConnectionManager(connectionConfig);

    // Forward connection manager events
    this.connectionManager.on('connected', (transport) => {
      this.emit('connected', transport);
    });

    this.connectionManager.on('disconnected', () => {
      this.emit('disconnected');
    });

    this.connectionManager.on('error', (error) => {
      this.emit('error', error);
    });

    this.connectionManager.on('oauth-redirect', (url) => {
      this.emit('oauth-redirect', url);
    });

    this.connectionManager.on('oauth-callback-received', (code) => {
      this.emit('oauth-callback-received', code);
    });

    this.connectionManager.on('connection-attempt', (transport) => {
      this.emit('connection-attempt', transport);
    });

    this.connectionManager.on('connection-failed', (transport, error) => {
      this.emit('connection-failed', transport, error);
    });
  }

  /**
   * Connect to an MCP server
   */
  async connect(serverUrl: string): Promise<void> {
    try {
      const connectionResult = await this.connectionManager.connect(serverUrl);
      
      this.client = connectionResult.client;
      this.transport = connectionResult.transport;
      this.transportType = connectionResult.transportType;
      this.isConnected = true;

      // Set up notification handlers
      if (this.client) {
        this.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
          this.emit('notification', notification);
        });
      }

    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * List all available tools from the server
   */
  async listTools(): Promise<Tool[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      const response = await this.client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );
      return response.tools || [];
    } catch (error) {
      throw new Error(`Failed to list tools: ${error}`);
    }
  }

  /**
   * Get detailed information about a specific tool
   */
  async getToolDetails(toolName: string): Promise<ToolDetails | null> {
    const tools = await this.listTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      return null;
    }

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    };
  }

  /**
   * Call a tool with the given arguments
   */
  async callTool(toolName: string, args: Record<string, unknown> = {}): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      const response = await this.client.request(
        {
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        },
        CallToolResultSchema
      );

      return response;
    } catch (error) {
      throw new Error(`Failed to call tool '${toolName}': ${error}`);
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    transportType: TransportType | null;
    hasOAuth: boolean;
  } {
    const oauthProvider = this.connectionManager.getOAuthProvider();
    return {
      isConnected: this.isConnected,
      transportType: this.transportType,
      hasOAuth: !!oauthProvider?.tokens()
    };
  }

  /**
   * Get the underlying client instance (for advanced usage)
   */
  getClient(): Client | null {
    return this.client;
  }

  /**
   * Get the OAuth provider (if available)
   */
  getOAuthProvider() {
    return this.connectionManager.getOAuthProvider();
  }

  /**
   * Close the connection and clean up resources
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        this.emit('error', error as Error);
      }
    }
    
    this.client = null;
    this.transport = null;
    this.transportType = null;
    this.isConnected = false;
    
    this.emit('disconnected');
  }
} 