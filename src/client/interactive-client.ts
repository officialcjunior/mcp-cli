import { createInterface } from 'node:readline';
import { 
  MCPClient, 
  BrowserOAuthHandler,
  listTools,
  showToolDetails,
  callTool,
  parseToolCallCommand
} from 'mcp-client-toolkit';

export class InteractiveClient {
  private mcpClient: MCPClient;
  
  private readonly rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  constructor(private serverUrl: string) {
    this.mcpClient = new MCPClient({
      callbackPort: 8090,
      oauthHandler: new BrowserOAuthHandler(8090)
    });

    // Convert library events to CLI output
    this.mcpClient.on('connected', (transport) => {
      console.log(`🎯 Successfully connected using ${transport} transport`);
    });

    this.mcpClient.on('connection-attempt', (transport) => {
      if (transport === 'streamable-http') {
        console.log('🚢 Trying Streamable HTTP transport with OAuth...');
      } else {
        console.log('📡 Falling back to SSE transport...');
        console.log('⚠️  Note: SSE transport may have limited OAuth support');
      }
    });

    this.mcpClient.on('oauth-redirect', (url) => {
      console.log(`📌 OAuth redirect handler called - opening browser`);
    });

    this.mcpClient.on('oauth-callback-received', (code) => {
      console.log(`✅ Authorization code received: ${code?.substring(0, 10)}...`);
      console.log('🔐 Authorization completed, reconnecting...');
    });

    this.mcpClient.on('connection-failed', (transport, error) => {
      console.log(`${transport} connection failed: ${error}`);
    });

    this.mcpClient.on('notification', (notification) => {
      console.log(`\nNotification: ${notification.params.level} - ${notification.params.data}`);
      // Re-display the prompt
      process.stdout.write('mcp> ');
    });

    this.mcpClient.on('error', (error) => {
      console.error('Client error:', error);
    });
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
      console.log(`🔗 Attempting to connect to ${this.serverUrl} with OAuth...`);
      await this.mcpClient.connect(this.serverUrl);
      
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
    
    const client = this.mcpClient.getClient();
    if (client) {
      await callTool(client, 'start-notification-stream', { interval, count });
    }
  }

  /**
   * Show current connection status
   */
  private showStatus(): void {
    const status = this.mcpClient.getConnectionStatus();
    const oauthProvider = this.mcpClient.getOAuthProvider();
    
    console.log('\n📊 Connection Status:');
    console.log(`  Server URL: ${this.serverUrl}`);
    console.log(`  Transport: ${status.transportType || 'Not connected'}`);
    console.log(`  Client: ${status.isConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`  OAuth: ${status.hasOAuth ? 'Authenticated' : 'Not authenticated'}`);
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log('\n📖 MCP Interactive Client Help');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Basic Commands
    console.log('\n🔰 Basic Commands:');
    console.log('  help                           - Show this help message');
    console.log('  quit, exit                     - Exit the client');
    console.log('  status                         - Show connection status');
    
    // Tool Management
    console.log('\n🔧 Tool Management:');
    console.log('  list                           - List available tools');
    console.log('  tool-details <name>            - Show detailed schema for a tool');
    console.log('  call <tool_name> [args]        - Call a tool with JSON arguments');
    
    // Notifications
    console.log('\n📢 Notifications:');
    console.log('  notifications [interval] [count] - Start notification stream');
    console.log('    interval: Time between notifications in ms (default: 2000)');
    console.log('    count: Number of notifications to receive (default: 5)');
    
    // Examples
    console.log('\n💡 Examples:');
    console.log('  # List all available tools');
    console.log('  > list');
    console.log('\n  # Get details about a specific tool');
    console.log('  > tool-details file-operations');
    console.log('\n  # Call a tool with arguments');
    console.log('  > call my-tool {"param": "value", "number": 42}');
    console.log('\n  # Start notification stream (1 sec interval, 10 notifications)');
    console.log('  > notifications 1000 10');
    console.log('\n  # Check connection status');
    console.log('  > status');
    
    // Tips
    console.log('\n💭 Tips:');
    console.log('  • Use tool-details to see required arguments for a tool');
    console.log('  • Arguments must be valid JSON format');
    console.log('  • Press Ctrl+C to exit at any time');
    console.log('  • Check status if you experience connection issues');
  }

  /**
   * Main interactive loop for user commands
   */
  async interactiveLoop(): Promise<void> {
    const status = this.mcpClient.getConnectionStatus();
    console.log('\n🎯 Interactive MCP Client');
    console.log(`Connected via: ${status.transportType}`);
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
          const client = this.mcpClient.getClient();
          if (client) {
            await listTools(client);
          } else {
            console.log('❌ Not connected to server');
          }
        } else if (command.startsWith('tool-details ')) {
          const toolName = command.split(' ')[1];
          const client = this.mcpClient.getClient();
          if (toolName && client) {
            await showToolDetails(client, toolName);
          } else if (!toolName) {
            console.log('❌ Please specify a tool name');
          } else {
            console.log('❌ Not connected to server');
          }
        } else if (command.startsWith('call ')) {
          const client = this.mcpClient.getClient();
          if (client) {
            const parsed = parseToolCallCommand(command);
            if (parsed) {
              await callTool(client, parsed.toolName, parsed.toolArgs);
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
    try {
      await this.mcpClient.close();
    } catch (error) {
      console.error('Error closing client:', error);
    }
    this.rl.close();
  }
} 