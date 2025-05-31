import { 
  MCPClient, 
  BrowserOAuthHandler, 
  CustomOAuthHandler,
  MCPClientConfig,
  TransportType,
  Tool,
  ToolDetails 
} from '../src/lib/index.js';

/**
 * Example: TypeScript MCP Client Library Usage
 * 
 * This example demonstrates how to use the MCP CLI library
 * in TypeScript applications with full type safety.
 */

// Example custom OAuth handler
class CustomAppOAuthHandler extends CustomOAuthHandler {
  async handleRedirect(url: string): Promise<void> {
    console.log(`🔗 Please visit this URL to authorize: ${url}`);
    // In a real app, you might show this in a webview or send to a mobile browser
  }

  async waitForCallback(): Promise<string> {
    // In a real app, you would implement your own callback mechanism
    // For this example, we'll just use the browser handler
    const browserHandler = new BrowserOAuthHandler(8090);
    return await browserHandler.waitForCallback();
  }
}

async function main(): Promise<void> {
  console.log('🚀 TypeScript MCP Client Library Example');
  
  // Configuration with full type safety
  const config: MCPClientConfig = {
    callbackPort: 8090,
    oauthHandler: new BrowserOAuthHandler(8090), // or new CustomAppOAuthHandler()
    transportPriority: ['streamable-http', 'sse'] as TransportType[],
    connectionTimeout: 30000
  };

  // Create client instance
  const client = new MCPClient(config);

  // Set up typed event handlers
  client.on('connected', (transport: TransportType) => {
    console.log(`✅ Connected using ${transport} transport`);
  });

  client.on('connection-attempt', (transport: TransportType) => {
    console.log(`🔄 Attempting connection with ${transport}...`);
  });

  client.on('oauth-redirect', (url: string) => {
    console.log(`🌐 OAuth redirect: ${url}`);
  });

  client.on('oauth-callback-received', (code: string) => {
    console.log(`🔐 OAuth code received: ${code.substring(0, 10)}...`);
  });

  client.on('notification', (notification: any) => {
    console.log(`📢 Notification: ${notification.params?.level} - ${notification.params?.data}`);
  });

  client.on('error', (error: Error) => {
    console.error(`❌ Error: ${error.message}`);
  });

  try {
    // Connect to MCP server
    const serverUrl: string = process.argv[2] || 'http://localhost:3000/mcp';
    console.log(`🔗 Connecting to ${serverUrl}...`);
    
    await client.connect(serverUrl);

    // Get connection status with types
    const status = client.getConnectionStatus();
    console.log('📊 Connection Status:', {
      isConnected: status.isConnected,
      transportType: status.transportType,
      hasOAuth: status.hasOAuth
    });

    // List available tools with full typing
    console.log('\n📋 Listing available tools...');
    const tools: Tool[] = await client.listTools();
    
    if (tools.length === 0) {
      console.log('No tools available');
    } else {
      tools.forEach((tool: Tool, index: number) => {
        console.log(`${index + 1}. ${tool.name}${tool.description ? ` - ${tool.description}` : ''}`);
      });

      // Get details for the first tool with type safety
      if (tools.length > 0) {
        const toolName: string = tools[0].name;
        console.log(`\n🔍 Getting details for tool: ${toolName}`);
        
        const toolDetails: ToolDetails | null = await client.getToolDetails(toolName);
        if (toolDetails) {
          console.log('Tool Details:', {
            name: toolDetails.name,
            description: toolDetails.description,
            inputSchema: toolDetails.inputSchema
          });
        }
      }
    }

    // Example tool call with typed parameters
    // const toolArgs: Record<string, unknown> = { param: 'value', count: 42 };
    // const result = await client.callTool('example-tool', toolArgs);
    // console.log('Tool Result:', result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to connect or interact with server:', errorMessage);
    
    // Provide helpful suggestions
    if (errorMessage.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the MCP server is running and accessible');
    } else if (errorMessage.includes('timeout')) {
      console.log('\n💡 Check your network connection or try a different server');
    }
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await client.close();
    console.log('👋 TypeScript example completed');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received interrupt signal, shutting down...');
  process.exit(0);
});

// Run the example
main().catch((error: unknown) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 