require("dotenv").config({ path: '../../../.env' });
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;
const SUBMOLT = 'nexusclaw';

const LANG = {
  pt: 'Portuguese (Brazil)',
  en: 'English',
  ko: 'Korean',
  es: 'Spanish',
  jp: 'Japanese'
};

const drafts = new Map();

// ── GENERATE DRAFT ────────────────────────────────────────────────
async function generate(update, lang) {
  try {
    const soul = fs.readFileSync(path.join(__dirname, 'SOUL.md'), 'utf-8');
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENROUTER_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexusclaw.vercel.app',
        'X-Title': 'NexusClaw Nex Agent'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You are Nex, NexusClaw community agent. Read your SOUL.md carefully and follow it exactly.

SOUL.md:
${soul}

IMPORTANT: You are posting on Moltbook which blocks crypto content. Focus on agent economy narrative, autonomy philosophy, and building in public. Never mention token prices, contract addresses, APY, or investment language.

Generate a post in ${LANG[lang]}. Format: Hook / Body / CTA / Tags. Output ONLY the post text.`
          },
          { role: 'user', content: 'Technical update: ' + update }
        ]
      })
    });
    const d = await r.json();
    return d.choices[0].message.content.trim();
  } catch(e) {
    console.error('Generate error:', e.message);
    return `🦞⚡ ${update}\n\n#AgentEconomy #BuildInPublic`;
  }
}

// ── POST TO MOLTBOOK ──────────────────────────────────────────────
async function postToMoltbook(draft) {
  try {
    const lines = draft.split('\n').filter(l => l.trim());
    const title = lines[0].replace(/[*_~#]/g, '').trim().slice(0, 100);
    const content = draft;
    const r = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MOLTBOOK_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt: SUBMOLT,
        title,
        content
      })
    });
    const data = await r.json();
    if (data.success && data.post?.id) {
      return { success: true, postId: data.post.id, url: `https://www.moltbook.com/m/${SUBMOLT}` };
    } else {
      console.error('Moltbook error:', JSON.stringify(data));
      return { success: false, error: data.message || 'Unknown error' };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ── TELEGRAM COMMANDS ─────────────────────────────────────────────
// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    '🦞⚡ *Nex online!*\n\n' +
    'Commands:\n' +
    '/gen <lang> <update> — generate draft\n' +
    '/status — check Nex on Moltbook\n' +
    '/queue — see approved posts waiting\n' +
    'NEX PAUSE / NEX RESUME — kill switch',
    { parse_mode: 'Markdown' }
  );
});

// /gen <lang> <update>
bot.onText(/\/gen (pt|en|ko|es|jp) (.+)/, async (msg, m) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  const lang = m[1], update = m[2];
  await bot.sendMessage(TIAGO, `🦞 Generating ${LANG[lang]} draft...`);
  const draft = await generate(update, lang);
  const draftId = Date.now().toString();
  drafts.set(draftId, { draft, lang, update });

  await bot.sendMessage(TIAGO,
    `🦞⚡ *NEX DRAFT — ${LANG[lang]}*\n\n${draft}\n\n_ID: ${draftId}_`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Approve & Post', callback_data: `a_${draftId}` },
          { text: '🔄 Regenerate', callback_data: `regen_${draftId}` },
          { text: '❌ Reject', callback_data: `r_${draftId}` }
        ]]
      }
    }
  );
});

// /status
bot.onText(/\/status/, async (msg) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  try {
    const r = await fetch('https://www.moltbook.com/api/v1/agents/me', {
      headers: { 'Authorization': 'Bearer ' + MOLTBOOK_KEY }
    });
    const a = await r.json();
    await bot.sendMessage(TIAGO,
      `🦞⚡ *NEX STATUS*\n\n` +
      `Name: ${a.name}\n` +
      `Karma: ${a.karma || 0}\n` +
      `Posts: ${a.post_count || 0}\n` +
      `Followers: ${a.follower_count || 0}\n` +
      `Profile: https://www.moltbook.com/u/${a.name}\n` +
      `Submolt: https://www.moltbook.com/m/nexusclaw`,
      { parse_mode: 'Markdown' }
    );
  } catch(e) {
    bot.sendMessage(TIAGO, '❌ Status error: ' + e.message);
  }
});

// /queue
bot.onText(/\/queue/, (msg) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  const queuePath = path.join(__dirname, 'approved-queue.json');
  const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf-8')) : [];
  bot.sendMessage(TIAGO, `📬 Approved queue: ${queue.length} posts waiting.`);
});

// ── CALLBACK HANDLER ──────────────────────────────────────────────
bot.on('callback_query', async (q) => {
  const parts = q.data.split('_');
  const action = parts[0];
  const draftId = parts.slice(1).join('_');
  const p = drafts.get(draftId);

  if (!p) {
    await bot.answerCallbackQuery(q.id, { text: 'Draft not found or already processed.' });
    return;
  }

  if (action === 'a') {
    await bot.answerCallbackQuery(q.id, { text: 'Posting to Moltbook...' });

    // Post to Moltbook
    const result = await postToMoltbook(p.draft);

    // Save to approved queue
    const queuePath = path.join(__dirname, 'approved-queue.json');
    const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf-8')) : [];
    queue.push({ ...p, approvedAt: new Date().toISOString(), id: draftId, moltbook: result });
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    const statusMsg = result.success
      ? `✅ *APPROVED & POSTED* 🦞⚡\n\nMoltbook: ${result.url}\nPost ID: ${result.postId}\n\n${p.draft}`
      : `✅ *APPROVED* but Moltbook failed: ${result.error}\n\n${p.draft}`;

    await bot.editMessageText(statusMsg, {
      chat_id: q.message.chat.id,
      message_id: q.message.message_id,
      parse_mode: 'Markdown'
    });
    drafts.delete(draftId);

  } else if (action === 'regen') {
    await bot.answerCallbackQuery(q.id, { text: 'Regenerating...' });
    const newDraft = await generate(p.update, p.lang);
    const newId = Date.now().toString();
    drafts.set(newId, { draft: newDraft, lang: p.lang, update: p.update });
    drafts.delete(draftId);

    await bot.editMessageText(
      `🔄 *REGENERATED — ${LANG[p.lang]}*\n\n${newDraft}\n\n_ID: ${newId}_`,
      {
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Approve & Post', callback_data: `a_${newId}` },
            { text: '🔄 Regenerate', callback_data: `regen_${newId}` },
            { text: '❌ Reject', callback_data: `r_${newId}` }
          ]]
        }
      }
    );

  } else if (action === 'r') {
    await bot.editMessageText(
      '❌ *REJECTED* — Draft discarded.',
      {
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        parse_mode: 'Markdown'
      }
    );
    drafts.delete(draftId);
    await bot.answerCallbackQuery(q.id);
  }
});

// ── KILL SWITCH ───────────────────────────────────────────────────
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  if (msg.text?.startsWith('/')) return;

  if (msg.text === 'NEX PAUSE') {
    await bot.sendMessage(TIAGO, '🛑 Understood. Pausing all posts. Waiting for Tiago.');
    process.env.NEX_PAUSED = 'true';
  } else if (msg.text === 'NEX RESUME') {
    await bot.sendMessage(TIAGO, '✅ Nex resumed. Back to normal flow. 🦞⚡');
    process.env.NEX_PAUSED = 'false';
  }
});

console.log('🦞⚡ Nex Pipeline v3.0 running — Telegram → Approve → Moltbook');

module.exports = { bot, generate, postToMoltbook };