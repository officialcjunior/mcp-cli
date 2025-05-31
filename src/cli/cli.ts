#!/usr/bin/env node

import { InteractiveClient } from '../client/interactive-client.js';

// Configuration
const DEFAULT_SERVER_URL = 'http://localhost:3000/mcp';

function showUsage(): void {
  console.log('🚀 MCP CLI - Interactive Client for Model Context Protocol');
  console.log();
  console.log('Usage:');
  console.log('  mcp-cli [server-url]');
  console.log('  npx mcp-cli [server-url]');
  console.log();
  console.log('Arguments:');
  console.log('  server-url    MCP server URL (default: http://localhost:3000/mcp)');
  console.log();
  console.log('Environment Variables:');
  console.log('  MCP_SERVER_URL    MCP server URL (overrides default)');
  console.log();
  console.log('Examples:');
  console.log('  mcp-cli');
  console.log('  mcp-cli http://localhost:8080/mcp');
  console.log('  mcp-cli https://example.com/mcp');
  console.log();
  console.log('Features:');
  console.log('  • OAuth 2.0 authentication support');
  console.log('  • Automatic transport fallback (HTTP → SSE)');
  console.log('  • Interactive command shell');
  console.log('  • Tool discovery and execution');
  console.log('  • Real-time notifications');
}

function parseArguments(): { serverUrl: string; showHelp: boolean } {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
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