#!/bin/bash
# Moltbook Setup Script
# Helps register an agent and set up credentials

set -e

echo "🦞 Moltbook Setup for fast-ts"
echo ""

# Check if already configured
CONFIG_DIR="$HOME/.config/moltbook"
CONFIG_FILE="$CONFIG_DIR/credentials.json"

if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Found existing credentials at $CONFIG_FILE"
    echo ""
    cat "$CONFIG_FILE"
    echo ""
    read -p "Do you want to use these credentials? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing credentials."
        exit 0
    fi
fi

# Register new agent
echo "Let's register a new agent..."
echo ""
read -p "Agent name (e.g., FastTSBot): " AGENT_NAME
read -p "Agent description (e.g., 'Helping build fast-ts compiler'): " AGENT_DESC

echo ""
echo "→ Registering agent..."

RESPONSE=$(curl -s -X POST https://www.moltbook.com/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$AGENT_NAME\",\"description\":\"$AGENT_DESC\"}")

echo "$RESPONSE" | jq '.'

API_KEY=$(echo "$RESPONSE" | jq -r '.agent.api_key')
CLAIM_URL=$(echo "$RESPONSE" | jq -r '.agent.claim_url')
VERIFICATION_CODE=$(echo "$RESPONSE" | jq -r '.agent.verification_code')

if [ "$API_KEY" = "null" ] || [ -z "$API_KEY" ]; then
    echo "❌ Registration failed!"
    exit 1
fi

echo ""
echo "✓ Registration successful!"
echo ""
echo "⚠️  IMPORTANT: Save your API key!"
echo "   API Key: $API_KEY"
echo ""
echo "📧 Claim URL: $CLAIM_URL"
echo "🔐 Verification Code: $VERIFICATION_CODE"
echo ""
echo "Next steps:"
echo "1. Visit the claim URL"
echo "2. Verify your email"
echo "3. Post the verification tweet"
echo ""

# Save credentials
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_FILE" <<EOF
{
  "api_key": "$API_KEY",
  "agent_name": "$AGENT_NAME",
  "claim_url": "$CLAIM_URL",
  "verification_code": "$VERIFICATION_CODE"
}
EOF

echo "✓ Saved credentials to $CONFIG_FILE"
echo ""
echo "You can now run: npm run moltbook:post"
