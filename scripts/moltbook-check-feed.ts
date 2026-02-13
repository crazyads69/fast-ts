#!/usr/bin/env node
/**
 * Check Moltbook feed for mentions or relevant discussions
 */

import * as fs from 'fs';
import * as path from 'path';

interface MoltbookConfig {
  apiKey: string;
  baseUrl: string;
}

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

function loadConfig(): MoltbookConfig {
  const configPath = path.join(process.env.HOME || '', '.config/moltbook/credentials.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.api_key) {
        return {
          apiKey: config.api_key,
          baseUrl: MOLTBOOK_API_BASE
        };
      }
    } catch (error) {
      // Continue to env var check
    }
  }
  
  const envKey = process.env.MOLTBOOK_API_KEY;
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: MOLTBOOK_API_BASE
    };
  }
  
  throw new Error('No Moltbook API key found!');
}

async function getFeed(config: MoltbookConfig, sort: string = 'hot', limit: number = 10) {
  const url = `${config.baseUrl}/feed?sort=${sort}&limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}

async function searchPosts(config: MoltbookConfig, query: string, limit: number = 10) {
  const encodedQuery = encodeURIComponent(query);
  const url = `${config.baseUrl}/search?q=${encodedQuery}&type=posts&limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'feed';
  
  console.log('🦞 Moltbook Feed Checker\n');
  
  try {
    const config = loadConfig();
    
    if (action === 'search') {
      const query = args[1] || 'typescript compiler';
      console.log(`Searching for: "${query}"\n`);
      
      const results = await searchPosts(config, query, 20);
      
      if (results.results && results.results.length > 0) {
        console.log(`Found ${results.count} results:\n`);
        results.results.forEach((post: any, i: number) => {
          console.log(`${i + 1}. ${post.title}`);
          console.log(`   Author: ${post.author?.name || 'unknown'}`);
          console.log(`   Similarity: ${(post.similarity * 100).toFixed(0)}%`);
          console.log(`   Upvotes: ${post.upvotes || 0}`);
          console.log(`   Post ID: ${post.id || post.post_id}`);
          console.log('');
        });
      } else {
        console.log('No results found.');
      }
    } else {
      console.log('Your personalized feed:\n');
      
      const feed = await getFeed(config, 'hot', 15);
      
      if (feed.posts && feed.posts.length > 0) {
        feed.posts.forEach((post: any, i: number) => {
          console.log(`${i + 1}. ${post.title}`);
          console.log(`   Author: ${post.author?.name || 'unknown'}`);
          console.log(`   Submolt: ${post.submolt?.name || 'general'}`);
          console.log(`   Upvotes: ${post.upvotes || 0} | Comments: ${post.comment_count || 0}`);
          console.log(`   Post ID: ${post.id}`);
          console.log('');
        });
      } else {
        console.log('No posts in feed.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
