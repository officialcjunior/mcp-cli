# MCP CLI

Interactive command-line client for Model Context Protocol (MCP) servers with OAuth 2.0 support and automatic transport fallback from Streamable HTTP to SSE.

This is just a dead simple client for testing and experimentation. This doesn't have an AI-enabled agentic loop.

## Features

- OAuth 2.0: Secure browser-based authentication redirect
- Transport: Adaptive HTTP/SSE protocol switching
- Notifications: Async server event handling
- Shell: Stateful REPL environment

## Installation

### Global Installation

```bash
npm install -g mcp-cli
```

### Using npx (no installation required)

```bash
npx mcp-cli
```

## Usage

### Basic Usage

```bash
# Connect to default server (http://localhost:3000/mcp)
mcp-cli

# Connect to specific server
mcp-cli http://localhost:8080/mcp

# Show help
mcp-cli --help
```

### Environment Variables

```bash
# Set default server URL
export MCP_SERVER_URL=http://localhost:8080/mcp
mcp-cli
```

### Interactive Commands

Once connected, you can use these commands in the interactive shell:

```bash
# List available tools
mcp> list

# Show detailed information about a tool
mcp> tool-details my-tool

# Call a tool with arguments
mcp> call my-tool {"param": "value", "number": 42}

# Start notification stream
mcp> notifications 1000 10

# Show connection status
mcp> status

# Show help
mcp> help

# Exit
mcp> quit
```

## Examples

### Calling Tools

```bash
# Simple tool call without arguments
mcp> call ping

# Tool call with string argument
mcp> call echo {"message": "Hello, World!"}

# Tool call with multiple arguments
mcp> call process-data {
  "input": "some data",
  "format": "json",
  "validate": true,
  "options": {
    "timeout": 30
  }
}
```

### Exploring Tools

```bash
# List all available tools
mcp> list

# Get detailed schema for a specific tool
mcp> tool-details file-operations
```

## OAuth Authentication

The client supports OAuth 2.0 authentication flow:

1. When connecting to a server that requires OAuth, the client will automatically open your browser
2. Complete the authorization in your browser
3. The client will receive the authorization code and complete the authentication
4. Future requests will use the stored tokens

The OAuth flow includes:
- PKCE (Proof Key for Code Exchange) for security
- Automatic token refresh
- Secure token storage (in-memory for this demo)

## Transport Fallback

The client tries multiple transport methods in order:

1. **Streamable HTTP** with OAuth support (preferred)
2. **Server-Sent Events (SSE)** as fallback

This ensures maximum compatibility with different MCP server implementations.

## Configuration

### Default Server URL

The client connects to `http://localhost:3000/mcp` by default. You can override this with:

1. Command line argument: `mcp-cli http://custom-server:8080/mcp`
2. Environment variable: `MCP_SERVER_URL=http://custom-server:8080/mcp`

### OAuth Callback Port

The OAuth callback server runs on port 8090 by default. Make sure this port is available when using OAuth authentication.