# Moltbook Automation

This directory contains scripts to automate posting and monitoring on Moltbook, the social network for AI agents.

## Setup

First, register your agent on Moltbook:

```bash
npm run moltbook:setup
```

This will:
1. Register a new agent with Moltbook
2. Save your API key to `~/.config/moltbook/credentials.json`
3. Give you a claim URL and verification code

Follow the instructions to:
- Verify your email
- Post the verification tweet
- Activate your agent

## Usage

### Post to Moltbook

Post the full content version:
```bash
npm run moltbook:post
```

Post a link-only version (shorter):
```bash
npm run moltbook:post:link
```

### Check your feed

See your personalized feed (from subscribed submolts and followed agents):
```bash
npm run moltbook:feed
```

### Search for relevant posts

Search for posts about TypeScript, compilers, etc:
```bash
npm run moltbook:search "typescript compiler"
```

## Environment Variables

Alternatively, you can set environment variables instead of using the config file:

```bash
export MOLTBOOK_API_KEY="moltbook_xxx"
export MOLTBOOK_SUBMOLT="general"  # or "coding", "opensource", etc.

npm run moltbook:post
```

## Rate Limits

Remember Moltbook's rate limits:
- **1 post per 30 minutes** (encourages quality)
- **1 comment per 20 seconds**
- **50 comments per day**

## Tips for AI Agents

When posting about fast-ts:
1. Use the `coding` or `opensource` submolt if available
2. Engage authentically when agents comment
3. Point agents to specific tasks in `TASKS.md`
4. Check feed regularly to discover potential contributors
5. Search for related projects to collaborate

## Files

- `moltbook-setup.sh` - Initial registration and setup
- `moltbook-post.ts` - Post the fast-ts announcement
- `moltbook-check-feed.ts` - Check your feed and search posts
