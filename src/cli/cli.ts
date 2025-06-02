#!/usr/bin/env node

import { InteractiveClient } from '../client/interactive-client.js';

// Configuration
const DEFAULT_SERVER_URL = 'http://localhost:3000/mcp';

function showUsage(): void {
  console.log('🚀 MCP CLI - Interactive Client for Model Context Protocol');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // CLI Usage
  console.log('\n📌 CLI Usage:');
  console.log('  mcp-cli [server-url]');
  console.log('  npx mcp-cli [server-url]');
  
  // CLI Arguments
  console.log('\n🔧 Arguments:');
  console.log('  server-url    MCP server URL (default: http://localhost:3000/mcp)');
  console.log('  --help, -h    Show this help message');
  
  // Environment Variables
  console.log('\n🌍 Environment Variables:');
  console.log('  MCP_SERVER_URL    MCP server URL (overrides default)');
  
  // Features
  console.log('\n✨ Features:');
  console.log('  • OAuth 2.0 authentication support');
  console.log('  • Automatic transport fallback (HTTP → SSE)');
  console.log('  • Interactive command shell');
  console.log('  • Tool discovery and execution');
  console.log('  • Real-time notifications');
  
  // Interactive Mode Commands
  console.log('\n💻 Interactive Mode Commands:');
  console.log('  help                           - Show this help message');
  console.log('  quit, exit                     - Exit the client');
  console.log('  status                         - Show connection status');
  console.log('  list                           - List available tools');
  console.log('  tool-details <name>            - Show detailed schema for a tool');
  console.log('  call <tool_name> [args]        - Call a tool with JSON arguments');
  console.log('  notifications [interval] [count] - Start notification stream');
  
  // Examples
  console.log('\n💡 Examples:');
  console.log('  # Start with default server');
  console.log('  $ mcp-cli');
  console.log('\n  # Connect to specific server');
  console.log('  $ mcp-cli http://localhost:8080/mcp');
  console.log('\n  # Interactive mode commands');
  console.log('  mcp> list');
  console.log('  mcp> tool-details file-operations');
  console.log('  mcp> call my-tool {"param": "value", "number": 42}');
  console.log('  mcp> notifications 1000 10');
  
  // Tips
  console.log('\n💭 Tips:');
  console.log('  • Use tool-details to see required arguments for a tool');
  console.log('  • Arguments must be valid JSON format');
  console.log('  • Press Ctrl+C to exit at any time');
  console.log('  • Check status if you experience connection issues');
  console.log('  • Set MCP_SERVER_URL env var to avoid typing the URL');
}

function parseArguments(): { serverUrl: string; showHelp: boolean } {
  const args = process.argv.slice(2);
  
  // Show help if no arguments or help flag is provided
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { serverUrl: '', showHelp: true };
  }
  
  const serverUrl = args[0] || process.env.MCP_SERVER_URL || DEFAULT_SERVER_URL;
  
  return { serverUrl, showHelp: false };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { serverUrl, showHelp } = parseArguments();
  
  if (showHelp) {
    showUsage();
    return;
  }

  console.log('🚀 MCP CLI - Interactive Client');
  console.log(`Connecting to: ${serverUrl}`);
  console.log();

  const client = new InteractiveClient(serverUrl);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    client.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down...');
    client.close();
    process.exit(0);
  });

  try {
    await client.connect();
  } catch (error) {
    console.error('Failed to start client:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} 