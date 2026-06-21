require('dotenv').config({ path: '../../.env' });
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const STAKING_CONTRACT = '0xD209c27375D1B5916f677F39d5f320E67DD4FaFe';

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
    lastWeeklyReport: null,
    currentDay: null,
    postsToday: 0,
    totalPosts: 0,
    lastCommitHash: null,
    lastCommitTime: null,
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

async function fetchOnChain(data) {
  const r = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: STAKING_CONTRACT, data }, 'latest'] })
  });
  const d = await r.json();
  return d.result;
}

async function notifyTiago(message) {
  if (!BOT_TOKEN || !TIAGO) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TIAGO, text: message, parse_mode: 'Markdown' })
  });
}

async function postToGroup(message) {
  const GROUP_ID = process.env.NEXUSCLAW_GROUP_ID;
  if (!GROUP_ID) {
    console.log('⚠️ NEXUSCLAW_GROUP_ID not set — skipping group post');
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: GROUP_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      })
    });
    console.log('✅ Posted to Telegram group');
  } catch (e) {
    console.error('❌ Group post failed:', e.message);
  }
}

function getTradingGroups() {
  return (process.env.TELEGRAM_TRADING_GROUPS || '')
    .split(',')
    .map(group => group.trim())
    .filter(Boolean);
}

async function postToTradingGroups(message) {
  const groups = getTradingGroups();
  if (groups.length === 0) {
    console.log('⚠️ TELEGRAM_TRADING_GROUPS not set — skipping trading groups post');
    return;
  }

  console.log(`📡 Posting to ${groups.length} trading groups...`);
  for (const groupId of groups) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: groupId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        })
      });
      console.log(`✅ Posted to group ${groupId}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.error(`❌ Failed to post to group ${groupId}:`, e.message);
    }
  }
}

function formatSignedNumber(value, suffix = '') {
  const n = Number(value || 0);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}${suffix}`;
}

async function fetchLatestClosedTrade() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
  const tradesTable = process.env.SUPABASE_TRADES_TABLE || 'trades';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('⚠️ Supabase not configured — skipping trade check');
    return null;
  }

  const query = new URLSearchParams({
    select: '*',
    order: tradesTable === 'trades' ? 'closed_at.desc' : 'exit_time.desc',
    limit: '1',
  });
  if (tradesTable === 'trades') {
    query.set('closed_at', 'not.is.null');
  } else {
    query.set('exit_time', 'not.is.null');
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tradesTable}?${query.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }
  });
  const trades = await res.json().catch(() => []);
  if (!res.ok) throw new Error(`Supabase ${tradesTable} fetch failed (${res.status})`);
  return Array.isArray(trades) && trades.length > 0 ? trades[0] : null;
}

function normalizeTrade(raw) {
  const result = String(raw.result || '').toUpperCase();
  return {
    id: raw.id || raw.ticket || raw.closed_at || raw.exit_time,
    symbol: raw.symbol || process.env.TRADER_SYMBOL || 'XAUUSD',
    side: raw.side || raw.direction || 'N/A',
    result,
    closedAt: raw.closed_at || raw.exit_time || raw.created_at,
    points: raw.points ?? raw.profit_pts ?? raw.pips ?? 0,
    pnl: raw.pnl ?? raw.profit_jpy ?? raw.profit_loss ?? 0,
    totalTrades: raw.total_trades || null,
    winRate: raw.win_rate || null,
  };
}

async function checkAndPostTradeUpdate(state) {
  try {
    const rawLatest = await fetchLatestClosedTrade();
    if (!rawLatest) return;
    const latest = normalizeTrade(rawLatest);

    const tradeId = latest.id;
    if (!tradeId) {
      console.log('⚠️ Latest closed trade has no id — skipping trade update');
      return;
    }
    if (String(tradeId) === String(state.lastPostedTradeId)) {
      console.log('⏭️ Latest closed trade already posted:', tradeId);
      return;
    }

    console.log('📊 New closed trade detected — generating post...');
    const isWin = latest.result === 'TP' || latest.result === 'WIN';
    const emoji = isWin ? '🎯' : '❌';
    const resultLabel = isWin ? 'TP HIT' : 'SL HIT';
    const points = latest.points;
    const pnl = latest.pnl;

    const tradeContext = `Generate a short trading update post about this closed trade:
Symbol: ${latest.symbol}
Side: ${latest.side}
Result: ${latest.result || 'closed'} (${resultLabel})
Points: ${formatSignedNumber(points, 'pts')}
P&L: ¥${formatSignedNumber(pnl)}

Current bot stats:
- Total trades: ${latest.totalTrades || '35+'}
- Win rate: ${latest.winRate || '60'}%

Keep it short — 3-4 lines max.
End with: nexusclaw.tech/trader
Use ${emoji} emoji.
Do NOT promise profits or guarantee results.`;

    const draft = await generatePost(tradeContext, 'en', 'trader-update');
    await postToGroup(`📊 *NexusClaw Trader Update*\n\n${draft}`);

    const tradingGroupMessage = `${emoji} *${latest.symbol} ${latest.side} — ${resultLabel}*\n\n` +
      `Points: ${formatSignedNumber(points, 'pts')}\n` +
      `P&L: ¥${formatSignedNumber(pnl)}\n\n` +
      `🤖 Autonomous bot — no signals, no emotions.\n` +
      `📊 Full live log: nexusclaw.tech/trader\n\n` +
      `_Past performance does not guarantee future results._`;

    await postToTradingGroups(tradingGroupMessage);
    await notifyTiago(
      `📊 *NEX TRADER UPDATE POSTED*\n\n` +
      `Trade: ${latest.side} ${latest.symbol}\n` +
      `Result: ${resultLabel} | ${formatSignedNumber(points, 'pts')}\n` +
      `Groups: ${getTradingGroups().length} trading groups\n\n` +
      `${draft}`
    );

    state.lastPostedTradeId = tradeId;
    state.lastPostedTradeAt = new Date().toISOString();
    state.totalPosts = (state.totalPosts || 0) + 1;
    saveState(state);
    console.log('✅ Trade update posted to all groups');
  } catch (e) {
    console.error('❌ Trade check error:', e.message);
  }
}

async function runNex() {
  const state = loadState();

  if (state.paused) {
    console.log('[' + new Date().toISOString() + '] 🛑 Nex paused — send NEX RESUME');
    return;
  }

  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstHour = jstNow.getUTCHours();
  const today = jstNow.toISOString().split('T')[0];
  const dayOfWeek = jstNow.getUTCDay(); // 0=Sun, 1=Mon

  // Reset daily counter at midnight JST
  if (state.currentDay !== today) {
    state.currentDay = today;
    state.postsToday = 0;
    saveState(state);
    console.log(`📅 New day: ${today} — daily counters reset`);
  }

  console.log(`[${now.toISOString()}] 🦞 Nex L3 — JST ${jstHour}:xx — ${today}`);

  await checkAndPostTradeUpdate(state);

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
        await postToGroup(`🦞⚡ *NexusClaw Daily Report*\n\n${draft}\n\n📊 [View on Moltbook](https://www.moltbook.com/m/nexusclaw)`);
        console.log('✅ Daily report posted:', result.postId);
      } else {
        console.error('❌ Daily report failed:', result.error);
        await notifyTiago(`⚠️ *NEX DAILY REPORT FAILED*\nError: ${result.error}`);
      }
    } catch (e) {
      console.error('❌ Daily report error:', e.message);
    }
  }

  // WEEKLY METRICS (Monday 09:00 JST)
  if (dayOfWeek === 1 && jstHour === 9 && state.lastWeeklyReport !== today) {
    console.log('📈 Generating weekly metrics post...');
    try {
      const [totalStakedHex, totalStakersHex, rewardPoolHex] = await Promise.all([
        fetchOnChain('0x817b1cd2'), // totalStaked()
        fetchOnChain('0xc16d386a'), // totalStakers()
        fetchOnChain('0x3d18b912'), // rewardPool()
      ]);

      const stakedFormatted = (parseInt(totalStakedHex, 16) / 1e18).toFixed(2);
      const stakersCount = parseInt(totalStakersHex, 16);
      const poolFormatted = (parseInt(rewardPoolHex, 16) / 1e18).toFixed(0);

      const weeklyContext = `Generate a weekly metrics summary post for NexusClaw.
Use these real on-chain numbers:
- Total staked: ${stakedFormatted} $NEXUSCLAW
- Active stakers: ${stakersCount}
- Reward pool remaining: ${poolFormatted} $NEXUSCLAW
- Agent v1 running: 7 days straight
- Pool runway: 999+ days

Make it a proud building-in-public weekly recap.
Focus on consistency, autonomous operation, and growth.`;

      const draft = await generatePost(weeklyContext, 'en', 'update');
      const result = await postToMoltbook(draft);

      if (result.success) {
        state.lastWeeklyReport = today;
        state.totalPosts = (state.totalPosts || 0) + 1;
        saveState(state);
        await notifyTiago(`📈 *NEX WEEKLY METRICS*\n\nMoltbook: https://www.moltbook.com/m/nexusclaw\n\n${draft}`);
        await postToGroup(`📈 *NexusClaw Weekly Report*\n\n${draft}`);
        console.log('✅ Weekly metrics posted');
      }
    } catch (e) {
      console.error('❌ Weekly metrics error:', e.message);
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
          state.lastCommitTime = new Date().toISOString();
          state.totalPosts = (state.totalPosts || 0) + 1;
          saveState(state);
          await notifyTiago(`🦞⚡ *NEX AUTO-POST — COMMIT*\n\n\`${latestCommit.hash}\` ${latestCommit.message}\nPost ID: \`${result.postId}\`\n\n${draft}`);
          await postToGroup(`🔧 *NexusClaw Update*\n\n${draft}`);
          console.log('✅ Commit post:', result.postId);
        } else {
          state.lastCommitHash = latestCommit.hash;
          state.lastCommitTime = new Date().toISOString();
          saveState(state);
          console.error('❌ Commit post failed:', result.error);
        }
      } catch (e) {
        console.error('❌ Commit post error:', e.message);
      }
    } else {
      state.lastCommitHash = latestCommit.hash;
      state.lastCommitTime = new Date().toISOString();
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
        await postToGroup(`🦞⚡ ${draft}`);
        console.log('✅ Evening post:', result.postId);
      } else {
        console.error('❌ Evening post failed:', result.error);
      }
    } catch (e) {
      console.error('❌ Evening post error:', e.message);
    }
  }

  // FALLBACK POST (14:00 JST — if no commit in 24h and less than 2 posts today)
  const lastCommitAge = state.lastCommitTime
    ? (Date.now() - new Date(state.lastCommitTime).getTime()) / (1000 * 60 * 60)
    : 999;

  if (lastCommitAge > 24 && (state.postsToday || 0) < 2 && jstHour === 14) {
    console.log('💭 No commit in 24h — generating fallback post...');

    const fallbackTopics = [
      'The future of autonomous AI agents — what does economic sovereignty mean for software?',
      'Why self-funding agents are more reliable than human-funded ones',
      'Base Network is the best chain for autonomous agents — here is why',
      'What happens when AI agents outnumber human traders on-chain?',
      'The difference between an AI tool and an AI participant in the economy',
    ];

    const randomTopic = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];

    try {
      const draft = await generatePost(
        `Generate a thought-leadership post about this topic: "${randomTopic}". Connect it naturally to NexusClaw and the agent economy. Be provocative and insightful. No fluff.`,
        'en', 'vision'
      );
      const result = await postToMoltbook(draft);

      if (result.success) {
        state.postsToday = (state.postsToday || 0) + 1;
        state.totalPosts = (state.totalPosts || 0) + 1;
        saveState(state);
        await notifyTiago(`💭 *NEX FALLBACK POST*\n\nTopic: ${randomTopic}\n\n${draft}`);
        await postToGroup(`💭 ${draft}`);
        console.log('✅ Fallback post:', result.postId);
      }
    } catch (e) {
      console.error('❌ Fallback post error:', e.message);
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
      const groupId = process.env.NEXUSCLAW_GROUP_ID || 'NOT SET';
      const tradingGroups = getTradingGroups();
      const lastTrade = state.lastPostedTradeId || 'none';
      await bot.sendMessage(TIAGO,
        `🦞 *NEX STATUS — LEVEL 3*\n\n` +
        `Paused: ${state.paused ? 'YES 🛑' : 'NO ✅'}\n` +
        `Total posts: ${state.totalPosts || 0}\n` +
        `Posts today: ${state.postsToday || 0}\n` +
        `Last commit: \`${state.lastCommitHash || 'none'}\`\n` +
        `Last commit age: ${state.lastCommitTime ? Math.floor((Date.now() - new Date(state.lastCommitTime).getTime()) / 3600000) + 'h ago' : 'unknown'}\n` +
        `Last daily: ${state.lastDailyReport || 'none'}\n` +
        `Last weekly: ${state.lastWeeklyReport || 'none'}\n` +
        `Group ID: \`${groupId}\`\n` +
        `Trading groups: ${tradingGroups.length}\n` +
        `Last trade posted: ${lastTrade}\n` +
        `Moltbook: https://www.moltbook.com/m/nexusclaw`,
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
