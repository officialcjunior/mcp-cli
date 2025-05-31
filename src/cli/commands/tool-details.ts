import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  ListToolsRequest,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { formatJsonSchema, generateExampleArgs } from '../../utils/schema.js';

/**
 * Show detailed information about a specific tool including its schema
 */
export async function showToolDetails(client: Client, toolName: string): Promise<void> {
  try {
    const request: ListToolsRequest = {
      method: 'tools/list',
      params: {}
    };
    const result = await client.request(request, ListToolsResultSchema);

    const tool = result.tools.find(t => t.name === toolName);
    if (!tool) {
      console.log(`❌ Tool '${toolName}' not found`);
      console.log('Available tools:', result.tools.map(t => t.name).join(', '));
      return;
    }

    console.log(`\n🔧 Tool Details: ${tool.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (tool.description) {
      console.log(`📝 Description: ${tool.description}`);
    }

    if (tool.inputSchema) {
      console.log('\n📋 Input Schema:');
      formatJsonSchema(tool.inputSchema, '  ');
      
      // Show example usage if we can infer it
      console.log('\n💡 Example usage:');
      const exampleArgs = generateExampleArgs(tool.inputSchema);
      console.log(`  call ${tool.name} ${JSON.stringify(exampleArgs, null, 2)}`);
    } else {
      console.log('\n⚠️  No input schema provided');
    }

  } catch (error) {
    console.error(`❌ Failed to get tool details: ${error}`);
  }
} 