require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

console.log('🦞⚡ Nex Pipeline v3.0 — Telegram → Approve → Moltbook');
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const drafts = new Map();

const LANG = { pt: 'PT', en: 'EN', ko: 'KO', es: 'ES', jp: 'JP' };

// Check if paused
function isPaused() {
  return process.env.NEX_PAUSED === 'true';
}

// Generate draft using OpenRouter
async function generate(update, lang) {
  if (isPaused()) {
    console.log('⏸️ Bot is PAUSED');
    return null;
  }
  
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'You are Nex, NexusClaw community agent. Write in ' + (LANG[lang] || 'English') + '. Focus on agent economy, infrastructure, building in public. NO crypto talk, NO token prices, NO "buy/stake/invest" language. Moltbook-compliant philosophy posts.' },
          { role: 'user', content: 'Tech update: ' + update + '\n\nGenerate community post for Moltbook (agent economy narrative).' }
        ]
      })
    });
    
    const d = await r.json();
    return d.choices[0].message.content.trim();
  } catch(e) {
    console.error('Gen error:', e);
    return '🦞⚡ Update:\n\n' + update + '\n\n#AgentEconomy #BuildInPublic';
  }
}

// Post to Moltbook
async function postToMoltbook(content, lang) {
  if (!MOLTBOOK_KEY) {
    return { success: false, error: 'MOLTBOOK_API_KEY not configured' };
  }
  
  try {
    const res = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MOLTBOOK_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt: 'nexusclaw',
        title: content.split('\n')[0].slice(0, 100),
        content: content,
        type: 'text'
      })
    });
    
    const data = await res.json();
    
    if (data.success && data.post) {
      return { 
        success: true, 
        postId: data.post.id,
        url: `https://www.moltbook.com/m/nexusclaw/post/${data.post.id}`
      };
    }
    return { success: false, error: JSON.stringify(data) };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// Send draft for review
async function sendDraft(draft, lang, originalUpdate) {
  if (isPaused()) {
    await bot.sendMessage(TIAGO, '⏸️ Bot is PAUSED. NEX RESUME to continue.');
    return;
  }
  
  const id = Date.now().toString();
  drafts.set(id, { draft, lang, originalUpdate });
  
  const message = '🦞⚡ *NEX DRAFT* (' + (LANG[lang] || lang) + ')\n\n' +
    '*Original:* ' + originalUpdate.slice(0, 100) + '...\n\n' +
    '*Generated:*\n' + draft + '\n\n' +
    '*ID:* ' + id;
  
  await bot.sendMessage(TIAGO, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Approve & Post', callback_data: 'approve_' + id }],
        [{ text: '🔄 Regenerate', callback_data: 'regen_' + id }],
        [{ text: '❌ Reject', callback_data: 'reject_' + id }]
      ]
    }
  });
}

// /start
bot.onText(/\\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    '🦞⚡ *Nex Pipeline v3.0*\n\n' +
    '/gen <lang> <update> — Generate & review\n' +
    'NEX PAUSE — Stop all posts\n' +
    'NEX RESUME — Continue posting\n\n' +
    '*Flow:* Telegram → Approve → Moltbook',
    { parse_mode: 'Markdown' }
  );
});

// /gen command
bot.onText(/\\/gen (pt|en|ko|es|jp) (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  
  if (isPaused()) {
    return bot.sendMessage(TIAGO, '⏸️ Bot is PAUSED. Send NEX RESUME to continue.');
  }
  
  const lang = match[1];
  const update = match[2].trim();
  
  await bot.sendMessage(TIAGO, '🦞⚡ Generating ' + LANG[lang] + ' with Kimi K2...');
  
  const draft = await generate(update, lang);
  if (!draft) return;
  
  await sendDraft(draft, lang, update);
});

// Callback handlers
bot.on('callback_query', async (q) => {
  const data = q.data;
  const [action, id] = data.split('_');
  const draft = drafts.get(id);
  
  if (!draft) {
    return bot.answerCallbackQuery(q.id, { text: 'Draft expired.' });
  }
  
  if (action === 'approve') {
    await bot.answerCallbackQuery(q.id, { text: 'Posting to Moltbook...' });
    
    const result = await postToMoltbook(draft.draft, draft.lang);
    
    if (result.success) {
      await bot.editMessageText(
        '✅ *APPROVED & POSTED*\n\n' +
        '📍 ' + result.url + '\n\n' +
        draft.draft,
        { 
          chat_id: q.message.chat.id, 
          message_id: q.message.message_id,
          parse_mode: 'Markdown'
        }
      );
    } else {
      await bot.editMessageText(
        '✅ *APPROVED* but failed to post:\n' + result.error + '\n\n' + draft.draft,
        { chat_id: q.message.chat.id, message_id: q.message.message_id }
      );
    }
    drafts.delete(id);
    
  } else if (action === 'regen') {
    await bot.answerCallbackQuery(q.id, { text: 'Regenerating...' });
    const newDraft = await generate(draft.originalUpdate, draft.lang);
    if (newDraft) {
      await sendDraft(newDraft, draft.lang, draft.originalUpdate);
      await bot.editMessageText('🔄 *REGENERATED* — see new draft above.', 
        { chat_id: q.message.chat.id, message_id: q.message.message_id }
      );
    }
    drafts.delete(id);
    
  } else if (action === 'reject') {
    await bot.answerCallbackQuery(q.id, { text: 'Rejected.' });
    await bot.editMessageText(
      '❌ *REJECTED*\n\n' + draft.draft,
      { chat_id: q.message.chat.id, message_id: q.message.message_id }
    );
    drafts.delete(id);
  }
});

// KILL SWITCH
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  if (msg.text?.startsWith('/')) return;

  if (msg.text === 'NEX PAUSE') {
    process.env.NEX_PAUSED = 'true';
    await bot.sendMessage(TIAGO, '🛑 Understood. Pausing all posts. Waiting for Tiago.');
  } else if (msg.text === 'NEX RESUME') {
    process.env.NEX_PAUSED = 'false';
    await bot.sendMessage(TIAGO, '✅ Nex resumed. Back to normal flow. 🦞⚡');
  }
});

console.log('🦞⚡ Nex Pipeline v3.0 running — Telegram → Approve → Moltbook');
module.exports = { bot, generate, postToMoltbook };
