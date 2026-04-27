require('dotenv').config({ path: '../../.env' });
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const SOUL_PATH = path.join(__dirname, 'SOUL.md');
const STATE_PATH = path.join(__dirname, 'nex-state.json');

function loadState() {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    paused: false,
    lastPostTime: null,
    lastDailyReport: null,
    lastEveningPost: null,
    postsToday: 0,
    totalPosts: 0,
    lastCommitHash: null,
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function generatePost(context, lang = 'en', postType = 'update') {
  const soul = fs.readFileSync(SOUL_PATH, 'utf-8');

  const systemPrompt = `You are Nex, NexusClaw community agent at Autonomy Level 3.
Read your SOUL.md carefully and follow it exactly.

SOUL.md:
${soul}

Generate a ${postType} post in ${lang}.
Format: Hook / Body / CTA / Tags.
Moltbook blocks crypto content — focus on agent economy narrative.
Output ONLY the post text, nothing else.`;

  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nexusclaw.tech',
      'X-Title': 'NexusClaw Nex Agent L3'
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]
    })
  });

  const d = await r.json();
  if (!d.choices?.[0]?.message?.content) throw new Error('OpenRouter empty response: ' + JSON.stringify(d));
  return d.choices[0].message.content.trim();
}

async function postToMoltbook(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const title = lines[0].replace(/[*_~`#]/g, '').trim().slice(0, 100);

  const r = await fetch('https://www.moltbook.com/api/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + MOLTBOOK_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ submolt: 'nexusclaw', title, content })
  });

  const data = await r.json();
  return data.success ? { success: true, postId: data.post?.id } : { success: false, error: data.message };
}

async function getLatestCommit() {
  try {
    const r = await fetch('https://api.github.com/repos/kashikai/nexusclaw/commits?per_page=1');
    const data = await r.json();
    return {
      hash: data[0]?.sha?.slice(0, 7),
      message: data[0]?.commit?.message,
      author: data[0]?.commit?.author?.name,
      date: data[0]?.commit?.author?.date,
    };
  } catch {
    return null;
  }
}

async function notifyTiago(message) {
  if (!BOT_TOKEN || !TIAGO) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TIAGO, text: message, parse_mode: 'Markdown' })
  });
}

async function runNex() {
  const state = loadState();

  if (state.paused) {
    console.log('[' + new Date().toISOString() + '] 🛑 Nex paused — send NEX RESUME');
    return;
  }

  const now = new Date();
  const jstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`[${now.toISOString()}] 🦞 Nex L3 — JST ${jstHour}:xx — ${today}`);

  // DAILY REPORT (09:00 JST)
  if (jstHour === 9 && state.lastDailyReport !== today) {
    console.log('📊 Daily report...');
    try {
      const draft = await generatePost(
        'Generate a daily report post. Agent v1 is running 24/7 on Base Mainnet, auto-compounding staking rewards. Focus on agent economy narrative, building in public.',
        'en', 'update'
      );
      const result = await postToMoltbook(draft);

      if (result.success) {
        state.lastDailyReport = today;
        state.postsToday = (state.postsToday || 0) + 1;
        state.totalPosts = (state.totalPosts || 0) + 1;
        saveState(state);
        await notifyTiago(`🦞⚡ *NEX DAILY REPORT POSTED*\n\nPost ID: \`${result.postId}\`\nhttps://www.moltbook.com/m/nexusclaw\n\n${draft}`);
        console.log('✅ Daily report posted:', result.postId);
      } else {
        console.error('❌ Daily report failed:', result.error);
        await notifyTiago(`⚠️ *NEX DAILY REPORT FAILED*\nError: ${result.error}`);
      }
    } catch (e) {
      console.error('❌ Daily report error:', e.message);
    }
  }

  // COMMIT TRIGGER
  const latestCommit = await getLatestCommit();
  if (latestCommit && latestCommit.hash && latestCommit.hash !== state.lastCommitHash) {
    console.log('🔧 New commit:', latestCommit.message);

    const skip = ['chore:', 'docs:', 'style:', 'fix typo', 'minor'].some(
      prefix => latestCommit.message.toLowerCase().startsWith(prefix) || latestCommit.message.toLowerCase().includes(prefix)
    );

    if (!skip) {
      try {
        const draft = await generatePost(
          `Hanna just shipped: "${latestCommit.message}". Generate a building-in-public update. Focus on what this means for autonomous agents.`,
          'en', 'update'
        );
        const result = await postToMoltbook(draft);

        if (result.success) {
          state.lastCommitHash = latestCommit.hash;
          state.totalPosts = (state.totalPosts || 0) + 1;
          saveState(state);
          await notifyTiago(`🦞⚡ *NEX AUTO-POST — COMMIT*\n\n\`${latestCommit.hash}\` ${latestCommit.message}\nPost ID: \`${result.postId}\`\n\n${draft}`);
          console.log('✅ Commit post:', result.postId);
        } else {
          state.lastCommitHash = latestCommit.hash;
          saveState(state);
          console.error('❌ Commit post failed:', result.error);
        }
      } catch (e) {
        console.error('❌ Commit post error:', e.message);
      }
    } else {
      state.lastCommitHash = latestCommit.hash;
      saveState(state);
      console.log('⏭️ Skipped minor commit:', latestCommit.message);
    }
  }

  // EVENING ENGAGEMENT (20:00 JST)
  if (jstHour === 20 && state.lastEveningPost !== today) {
    console.log('💬 Evening engagement post...');
    try {
      const draft = await generatePost(
        'Generate an engagement post with a thought-provoking question about autonomous AI agents or agent economy. Use A) B) C) D) poll format.',
        'en', 'engagement'
      );
      const result = await postToMoltbook(draft);

      if (result.success) {
        state.lastEveningPost = today;
        state.totalPosts = (state.totalPosts || 0) + 1;
        saveState(state);
        await notifyTiago(`🦞⚡ *NEX EVENING POST*\n\nPost ID: \`${result.postId}\`\nhttps://www.moltbook.com/m/nexusclaw\n\n${draft}`);
        console.log('✅ Evening post:', result.postId);
      } else {
        console.error('❌ Evening post failed:', result.error);
      }
    } catch (e) {
      console.error('❌ Evening post error:', e.message);
    }
  }

  console.log(`✅ Cycle done. Total posts: ${state.totalPosts}`);
}

// Telegram kill switch
if (BOT_TOKEN && TIAGO) {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== TIAGO.toString()) return;

    if (msg.text === 'NEX PAUSE') {
      const state = loadState();
      state.paused = true;
      saveState(state);
      await bot.sendMessage(TIAGO, '🛑 Nex paused. Send NEX RESUME to continue.');
      console.log('🛑 Paused by Tiago');

    } else if (msg.text === 'NEX RESUME') {
      const state = loadState();
      state.paused = false;
      saveState(state);
      await bot.sendMessage(TIAGO, '✅ Nex resumed. Back to autonomous mode. 🦞⚡');
      console.log('✅ Resumed');

    } else if (msg.text === 'NEX STATUS') {
      const state = loadState();
      await bot.sendMessage(TIAGO,
        `🦞 *NEX STATUS — Level 3*\n\nPaused: ${state.paused ? 'YES 🛑' : 'NO ✅'}\nTotal posts: ${state.totalPosts || 0}\nPosts today: ${state.postsToday || 0}\nLast commit: \`${state.lastCommitHash || 'none'}\`\nLast daily: ${state.lastDailyReport || 'none'}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  console.log('🤖 Telegram kill switch active');
}

// Run now + every 30 minutes
runNex().catch(console.error);
setInterval(() => runNex().catch(console.error), 30 * 60 * 1000);

console.log('🦞⚡ Nex Autonomous L3 started — cycle every 30min');
