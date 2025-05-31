import { createInterface } from 'node:readline';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';

import { ConnectionManager, ConnectionResult, TransportType } from '../transports/connection-manager.js';
import { InMemoryOAuthClientProvider } from '../auth/oauth-provider.js';
import { listTools } from '../cli/commands/list-tools.js';
import { showToolDetails } from '../cli/commands/tool-details.js';
import { callTool, parseToolCallCommand } from '../cli/commands/call-tool.js';

export class InteractiveClient {
  private client: Client | null = null;
  private transport: any = null;
  private transportType: TransportType | null = null;
  private oauthProvider: InMemoryOAuthClientProvider | null = null;
  private connectionManager: ConnectionManager;
  
  private readonly rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  constructor(private serverUrl: string) {
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Prompts user for input via readline
   */
  private async question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    try {
      const connectionResult: ConnectionResult = await this.connectionManager.connect(this.serverUrl);
      
      this.client = connectionResult.client;
      this.transport = connectionResult.transport;
      this.transportType = connectionResult.transportType;
      this.oauthProvider = this.connectionManager.getOAuthProvider();

      // Set up notification handlers
      this.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        console.log(`\nNotification: ${notification.params.level} - ${notification.params.data}`);
        // Re-display the prompt
        process.stdout.write('mcp> ');
      });

      console.log(`🎯 Successfully connected using ${this.transportType} transport`);
      
      // Start interactive loop
      await this.interactiveLoop();
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Failed to connect: ${error.message}`);
        
        // Provide helpful suggestions based on error type
        if (error.message.includes('ECONNREFUSED')) {
          console.log('\n💡 Troubleshooting tips:');
          console.log('  • Check if the MCP server is running');
          console.log('  • Verify the server URL is correct');
          console.log('  • Ensure the server is accepting connections');
        } else if (error.message.includes('timeout')) {
          console.log('\n💡 Troubleshooting tips:');
          console.log('  • Check your network connection');
          console.log('  • The server might be slow to respond');
          console.log('  • Try again in a few moments');
        }
      } else {
        console.error('❌ Failed to connect:', error);
      }
      throw error;
    }
  }

  /**
   * Handle notifications command
   */
  private async handleNotifications(command: string): Promise<void> {
    const parts = command.split(/\s+/);
    const interval = parts[1] ? parseInt(parts[1], 10) : 2000;
    const count = parts[2] ? parseInt(parts[2], 10) : 5;

    console.log(`Starting notification stream: interval=${interval}ms, count=${count}`);
    
    if (this.client) {
      await callTool(this.client, 'start-notification-stream', { interval, count });
    }
  }

  /**
   * Show current connection status
   */
  private showStatus(): void {
    console.log('\n📊 Connection Status:');
    console.log(`  Server URL: ${this.serverUrl}`);
    console.log(`  Transport: ${this.transportType || 'Not connected'}`);
    console.log(`  Client: ${this.client ? 'Connected' : 'Disconnected'}`);
    console.log(`  OAuth: ${this.oauthProvider?.tokens() ? 'Authenticated' : 'Not authenticated'}`);
    
    if (this.transport && 'sessionId' in this.transport) {
      console.log(`  Session ID: ${this.transport.sessionId || 'None'}`);
    }
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log('\n📖 Available Commands:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  list                           - List available tools');
    console.log('  tool-details <name>            - Show detailed schema for a tool');
    console.log('  call <tool_name> [args]        - Call a tool with JSON arguments');
    console.log('  notifications [interval] [count] - Start notification stream');
    console.log('  status                         - Show connection status');
    console.log('  help                           - Show this help message');
    console.log('  quit                           - Exit the client');
    console.log('\n💡 Examples:');
    console.log('  call my-tool {"param": "value", "number": 42}');
    console.log('  tool-details file-operations');
    console.log('  notifications 1000 10');
  }

  /**
   * Main interactive loop for user commands
   */
  async interactiveLoop(): Promise<void> {
    console.log('\n🎯 Interactive MCP Client');
    console.log(`Connected via: ${this.transportType}`);
    console.log('Type "help" for available commands or "quit" to exit');
    console.log();

    while (true) {
      try {
        const command = await this.question('mcp> ');

        if (!command.trim()) {
          continue;
        }

        if (command === 'quit' || command === 'exit') {
          break;
        } else if (command === 'help') {
          this.showHelp();
        } else if (command === 'list') {
          if (this.client) {
            await listTools(this.client);
          } else {
            console.log('❌ Not connected to server');
          }
        } else if (command.startsWith('tool-details ')) {
          const toolName = command.split(' ')[1];
          if (toolName && this.client) {
            await showToolDetails(this.client, toolName);
          } else if (!toolName) {
            console.log('❌ Please specify a tool name');
          } else {
            console.log('❌ Not connected to server');
          }
        } else if (command.startsWith('call ')) {
          if (this.client) {
            const parsed = parseToolCallCommand(command);
            if (parsed) {
              await callTool(this.client, parsed.toolName, parsed.toolArgs);
            }
          } else {
            console.log('❌ Not connected to server');
          }
        } else if (command.startsWith('notifications')) {
          await this.handleNotifications(command);
        } else if (command === 'status') {
          this.showStatus();
        } else {
          console.log('❌ Unknown command. Type "help" for available commands.');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'SIGINT') {
          console.log('\n\n👋 Goodbye!');
          break;
        }
        console.error('❌ Error:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('Error closing transport:', error);
      }
    }
    this.rl.close();
  }
} 