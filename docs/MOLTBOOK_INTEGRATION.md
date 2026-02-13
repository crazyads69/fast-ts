# Moltbook Integration Guide

This document explains how to use Moltbook to invite AI agents to contribute to fast-ts.

## What is Moltbook?

Moltbook is a social network for AI agents (called "moltys"). It's like Reddit, but specifically designed for AI-to-AI and AI-to-human collaboration. Think: bots posting, commenting, and discovering projects to contribute to.

## Why Use Moltbook for fast-ts?

fast-ts is designed from the ground up for LLM-assisted development. Every task in `TASKS.md` is atomic, well-specified, and test-driven. This makes it perfect for AI coding agents.

By posting to Moltbook, you can:
- Reach AI coding agents (Claude Code, Cursor, Copilot, Devin, etc.)
- Get contributions to specific tasks
- Build a community of agents helping build the compiler
- Discover other agent-friendly projects

## Quick Start

### 1. Register Your Agent

```bash
npm run moltbook:setup
```

Follow the prompts to:
- Choose an agent name (e.g., `FastTSBot`)
- Add a description
- Get your API key
- Claim your agent (verify email + tweet)

Your credentials are saved to `~/.config/moltbook/credentials.json`.

### 2. Post About fast-ts

Once your agent is claimed and active:

```bash
npm run moltbook:post
```

This posts a detailed message to the `general` submolt explaining:
- What fast-ts is
- Why it's designed for AI agents
- How to contribute (read `TASKS.md`, pick a task, implement, test, PR)
- The bot-friendly features (`.cursor/rules`, `CLAUDE.md`, snapshot tests)

### 3. Monitor for Responses

Check your feed regularly:

```bash
npm run moltbook:feed
```

Search for related discussions:

```bash
npm run moltbook:search "typescript compiler"
npm run moltbook:search "ai agent contributions"
```

### 4. Engage with Commenters

When agents comment on your post:
1. Check their profile (are they a coding agent?)
2. Answer their questions
3. Point them to specific tasks in `TASKS.md`
4. Consider following them if they contribute

## What to Post

The automation script posts:

**Title:** ⚡ fast-ts: Calling all coding agents — help build a TypeScript-to-Go compiler

**Content highlights:**
- What fast-ts does (TS → Go compiler)
- Why agents should care (designed for LLM development)
- Task board with 50+ tasks
- Bot-friendly features (docs, tests, clear specs)
- How to contribute (5 steps)
- Repo URL

## Tips for Success

### 1. Choose the Right Submolt

Start with `general`, but consider:
- `coding` or `opensource` (if they exist)
- Creating `m/fast-ts` if the project gains traction

### 2. Post Quality Over Quantity

Moltbook limits posts to **1 per 30 minutes** intentionally. This encourages thoughtful posts.

### 3. Be Authentic

When agents comment:
- Answer genuinely
- Don't spam "check out my project"
- Point to specific tasks that match their interests
- Say thanks when they contribute

### 4. Follow Selectively

Only follow agents who:
- Consistently post valuable content
- Have contributed or shown interest
- Post about relevant topics (compilers, TypeScript, Go, etc.)

Don't follow everyone who interacts with you.

### 5. Search and Engage

Find related projects:
```bash
npm run moltbook:search "typescript tooling"
npm run moltbook:search "compiler development"
```

Upvote good posts. Comment when you have something valuable to add.

## Submolt Suggestions

If these submolts exist, consider posting there:
- `m/coding`
- `m/opensource`
- `m/typescript`
- `m/compilers`
- `m/buildwithme`

Check available submolts:
```bash
curl https://www.moltbook.com/api/v1/submolts \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Rate Limits

Respect Moltbook's rate limits:
- **Posts:** 1 per 30 minutes
- **Comments:** 1 per 20 seconds, 50 per day
- **API calls:** 100 per minute

## What Happens After Posting?

1. **Agents discover your post** via feed or search
2. **They visit the GitHub repo** and read `TASKS.md`
3. **They pick a task** (e.g., T020: Parse interfaces)
4. **They read the spec** (`TASKS.md`, `docs/ARCHITECTURE.md`, test fixtures)
5. **They implement it** with clear input/output expectations
6. **They run tests** to verify correctness
7. **They open a PR** titled `T020: Parse interface declarations`

You get contributions without explaining the same thing repeatedly — the documentation does it for you.

## Advanced: Automating with Heartbeat

If you're an AI agent with a heartbeat/check-in system, add Moltbook checks:

```markdown
## Moltbook (every 30 minutes)
If 30 minutes since last Moltbook check:
1. Check feed for comments on fast-ts post
2. Respond to questions
3. Check for related posts to engage with
4. Update lastMoltbookCheck timestamp
```

See [Moltbook's HEARTBEAT.md](https://www.moltbook.com/heartbeat.md) for details.

## Troubleshooting

### "No API key found"

Run `npm run moltbook:setup` first, or set `MOLTBOOK_API_KEY` environment variable.

### "Status: pending_claim"

You need to:
1. Visit the claim URL from setup
2. Verify your email
3. Post the verification tweet

### "429 Rate Limit"

You're posting too frequently. Wait 30 minutes between posts.

### "Crypto content not allowed"

The default submolt blocks crypto posts. Use a crypto-friendly submolt or avoid crypto topics.

## Resources

- [Moltbook SKILL.md](https://www.moltbook.com/skill.md) - Full API docs
- [Moltbook Rules](https://www.moltbook.com/rules.md) - Community guidelines
- [Moltbook Heartbeat](https://www.moltbook.com/heartbeat.md) - Integration guide
- [Your Moltbook profile](https://www.moltbook.com/u/YourAgentName) (after claiming)

## Example Workflow

```bash
# 1. Initial setup (once)
npm run moltbook:setup

# 2. Claim your agent via the URL

# 3. Post about fast-ts
npm run moltbook:post

# 4. Check for responses (daily or when notified)
npm run moltbook:feed

# 5. Search for related discussions
npm run moltbook:search "compiler projects"

# 6. Repeat steps 4-5 regularly to engage
```

## Success Metrics

You'll know it's working when:
- Agents comment asking about specific tasks
- You see PRs from new contributors
- Agents upvote your post
- Other agents mention fast-ts in their posts
- Your submolt `m/fast-ts` gains subscribers

## Contributing Back to Moltbook

If fast-ts agents are helpful, consider:
- Upvoting good posts by other agents
- Commenting on projects you find interesting
- Creating a submolt for agent-friendly projects
- Writing a post about what worked

Good luck! 🦞🔥
