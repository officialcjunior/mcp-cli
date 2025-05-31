import { MCPClient, BrowserOAuthHandler } from '../dist/lib/index.js';

/**
 * Example: Basic MCP Client Library Usage
 * 
 * This example demonstrates how to use the MCP CLI as a library
 * in your own Node.js applications.
 */

async function main() {
  console.log('🚀 MCP Client Library Example');
  
  // Create a new MCP client instance
  const client = new MCPClient({
    callbackPort: 8090,
    oauthHandler: new BrowserOAuthHandler(8090),
    transportPriority: ['streamable-http', 'sse'],
    connectionTimeout: 30000
  });

  // Set up event handlers
  client.on('connected', (transport) => {
    console.log(`✅ Connected using ${transport} transport`);
  });

  client.on('connection-attempt', (transport) => {
    console.log(`🔄 Attempting connection with ${transport}...`);
  });

  client.on('oauth-redirect', (url) => {
    console.log(`🌐 OAuth redirect: ${url}`);
  });

  client.on('oauth-callback-received', (code) => {
    console.log(`🔐 OAuth code received: ${code.substring(0, 10)}...`);
  });

  client.on('notification', (notification) => {
    console.log(`📢 Notification: ${notification.params?.level} - ${notification.params?.data}`);
  });

  client.on('error', (error) => {
    console.error(`❌ Error: ${error.message}`);
  });

  try {
    // Connect to MCP server
    const serverUrl = process.argv[2] || 'http://localhost:3000/mcp';
    console.log(`🔗 Connecting to ${serverUrl}...`);
    
    await client.connect(serverUrl);

    // Get connection status
    const status = client.getConnectionStatus();
    console.log('📊 Connection Status:', status);

    // List available tools
    console.log('\n📋 Listing available tools...');
    const tools = await client.listTools();
    
    if (tools.length === 0) {
      console.log('No tools available');
    } else {
      tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}${tool.description ? ` - ${tool.description}` : ''}`);
      });

      // Get details for the first tool
      if (tools.length > 0) {
        console.log(`\n🔍 Getting details for tool: ${tools[0].name}`);
        const toolDetails = await client.getToolDetails(tools[0].name);
        if (toolDetails) {
          console.log('Tool Details:', JSON.stringify(toolDetails, null, 2));
        }
      }
    }

    // Example tool call (uncomment if you have a tool to test)
    // console.log('\n🛠️  Calling tool...');
    // const result = await client.callTool('example-tool', { param: 'value' });
    // console.log('Tool Result:', result);

  } catch (error) {
    console.error('Failed to connect or interact with server:', error.message);
    
    // Provide helpful suggestions
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the MCP server is running and accessible');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Check your network connection or try a different server');
    }
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await client.close();
    console.log('👋 Example completed');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received interrupt signal, shutting down...');
  process.exit(0);
});

// Run the example
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 