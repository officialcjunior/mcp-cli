import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  CallToolRequest,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Call a tool with the provided arguments
 */
export async function callTool(client: Client, toolName: string, toolArgs: Record<string, unknown>): Promise<void> {
  try {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs
      }
    };

    console.log(`\n🔧 Calling tool '${toolName}' with args:`, toolArgs);
    const result = await client.request(request, CallToolResultSchema);

    console.log(`\n✅ Tool '${toolName}' result:`);
    if (result.content) {
      result.content.forEach((content) => {
        if (content.type === 'text') {
          console.log(content.text);
        } else {
          console.log(content);
        }
      });
    } else {
      console.log(result);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        console.error(`❌ Tool '${toolName}' not found on the server`);
      } else if (error.message.includes('invalid')) {
        console.error(`❌ Invalid arguments for tool '${toolName}':`, error.message);
      } else if (error.message.includes('timeout')) {
        console.error(`❌ Tool '${toolName}' execution timed out`);
      } else {
        console.error(`❌ Failed to call tool '${toolName}':`, error.message);
      }
    } else {
      console.error(`❌ Failed to call tool '${toolName}':`, error);
    }
  }
}

/**
 * Parse tool call command arguments
 */
export function parseToolCallCommand(command: string): { toolName: string; toolArgs: Record<string, unknown> } | null {
  const parts = command.split(/\s+/);
  const toolName = parts[1];

  if (!toolName) {
    console.log('❌ Please specify a tool name');
    return null;
  }

  // Parse arguments (simple JSON-like format)
  let toolArgs: Record<string, unknown> = {};
  if (parts.length > 2) {
    const argsString = parts.slice(2).join(' ');
    try {
      toolArgs = JSON.parse(argsString);
    } catch {
      console.log('❌ Invalid arguments format (expected JSON)');
      console.log('Example: call my-tool {"param": "value", "number": 42}');
      return null;
    }
  }

  return { toolName, toolArgs };
} 