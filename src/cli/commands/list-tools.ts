import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ListToolsRequest,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * List available tools on the server (basic info)
 */
export async function listTools(client: Client): Promise<void> {
  try {
    const request: ListToolsRequest = {
      method: 'tools/list',
      params: {}
    };
    const result = await client.request(request, ListToolsResultSchema);

    console.log('\n📋 Available tools:');
    if (result.tools.length === 0) {
      console.log('  No tools available');
    } else {
      result.tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`   Description: ${tool.description}`);
        }
        console.log();
      });
      console.log('💡 Use "tool-details <name>" to see parameter schemas');
    }
  } catch (error) {
    console.error('❌ Failed to list tools:', error);
  }
} 