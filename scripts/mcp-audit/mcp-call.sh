#!/bin/bash
# Thin wrapper so a subagent's command line is exactly: ./mcp-call.sh <tool_name> '<json_arguments>'
exec node --experimental-transform-types "$(dirname "$0")/mcp-call.mjs" "$@"
