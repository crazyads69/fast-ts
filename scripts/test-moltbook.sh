#!/bin/bash
# Quick test of Moltbook automation

set -e

echo "🧪 Testing Moltbook Automation Scripts"
echo ""

# Check if scripts exist
echo "→ Checking scripts..."
if [ ! -f "scripts/moltbook-setup.sh" ]; then
    echo "❌ scripts/moltbook-setup.sh not found"
    exit 1
fi

if [ ! -f "scripts/moltbook-post.ts" ]; then
    echo "❌ scripts/moltbook-post.ts not found"
    exit 1
fi

if [ ! -f "scripts/moltbook-check-feed.ts" ]; then
    echo "❌ scripts/moltbook-check-feed.ts not found"
    exit 1
fi

echo "✓ All scripts exist"
echo ""

# Check if scripts are executable
echo "→ Checking permissions..."
if [ ! -x "scripts/moltbook-setup.sh" ]; then
    echo "❌ scripts/moltbook-setup.sh is not executable"
    echo "   Run: chmod +x scripts/moltbook-setup.sh"
    exit 1
fi
echo "✓ Setup script is executable"
echo ""

# Check TypeScript syntax
echo "→ Checking TypeScript syntax..."
npx tsc --noEmit scripts/moltbook-post.ts 2>&1 | head -20
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ TypeScript errors in moltbook-post.ts"
    exit 1
fi

npx tsc --noEmit scripts/moltbook-check-feed.ts 2>&1 | head -20
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ TypeScript errors in moltbook-check-feed.ts"
    exit 1
fi
echo "✓ TypeScript files are valid"
echo ""

# Test config loading logic
echo "→ Testing config loading..."
CONFIG_FILE="$HOME/.config/moltbook/credentials.json"
if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Found existing credentials at $CONFIG_FILE"
    cat "$CONFIG_FILE" | jq '.' > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Credentials file is valid JSON"
        AGENT_NAME=$(cat "$CONFIG_FILE" | jq -r '.agent_name')
        echo "  Agent name: $AGENT_NAME"
    else
        echo "⚠️  Credentials file exists but is not valid JSON"
    fi
else
    echo "⚠️  No credentials file found (run: npm run moltbook:setup)"
fi
echo ""

# Check environment variables
echo "→ Checking environment variables..."
if [ -n "$MOLTBOOK_API_KEY" ]; then
    echo "✓ MOLTBOOK_API_KEY is set"
else
    echo "⚠️  MOLTBOOK_API_KEY is not set (you can use config file instead)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Moltbook automation setup looks good!"
echo ""
echo "Next steps:"
echo "1. Run: npm run moltbook:setup (if not already done)"
echo "2. Claim your agent via the URL"
echo "3. Run: npm run moltbook:post"
echo ""
echo "See docs/MOLTBOOK_INTEGRATION.md for full guide"
