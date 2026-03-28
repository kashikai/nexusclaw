require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;
const drafts = new Map();

const LANG = { pt: 'PT', en: 'EN', ko: 'KO', es: 'ES', jp: 'JP' };

// Generate draft using OpenRouter
async function gen(update, lang) {
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          { role: 'system', content: 'You are Nex, NexusClaw community agent. Write in ' + LANG[lang] + '. Energetic but credible. No price promises.' },
          { role: 'user', content: 'Tech update: ' + update }
        ]
      })
    });
    const d = await r.json();
    return d.choices[0].message.content.trim();
  } catch(e) {
    return '🦞 ' + update;
  }
}

// Send draft for review
async function send(draft, lang) {
  const id = Date.now().toString();
  drafts.set(id, { draft, lang });
  bot.sendMessage(TIAGO, 
    '🦞⚡ DRAFT (' + LANG[lang] + ')\n\n' + draft,
    { 
      parse_mode: 'Markdown', 
      reply_markup: { 
        inline_keyboard: [[
          { text: '✅ Aprovar', callback_data: 'a_' + id },
          { text: '❌ Rejeitar', callback_data: 'r_' + id }
        ]] 
      }
    }
  );
}

// Post approved draft to Moltbook
async function postToMoltbook(draft, lang) {
  if (!MOLTBOOK_KEY) {
    console.error('❌ MOLTBOOK_API_KEY not set');
    return { success: false, error: 'MOLTBOOK_API_KEY not configured' };
  }
  
  const submoltMap = {
    en: 'm/NexusClaw',
    pt: 'm/NexusClaw', 
    ko: 'm/NexusClaw',
    jp: 'm/NexusClaw',
    es: 'm/NexusClaw'
  };
  
  try {
    const res = await fetch('https://api.moltbook.com/posts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MOLTBOOK_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'text',
        title: draft.split('\n')[0].replace(/[*_~]/g, '').slice(0, 100),
        content: draft,
        submolt: submoltMap[lang] || 'm/NexusClaw'
      })
    });
    
    const data = await res.json();
    
    if (data.id || data.post_id) {
      console.log('✅ Posted to Moltbook:', data.id || data.post_id);
      return { success: true, postId: data.id || data.post_id };
    } else {
      console.error('❌ Moltbook error:', JSON.stringify(data));
      return { success: false, error: JSON.stringify(data) };
    }
  } catch(e) {
    console.error('❌ Moltbook post failed:', e.message);
    return { success: false, error: e.message };
  }
}

// Language-specific generators
bot.onText(/\/gen (pt|en|ko|es|jp) (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  const lang = match[1], update = match[2];
  bot.sendMessage(TIAGO, '🦞 Gerando ' + LANG[lang] + '...');
  const draft = await gen(update, lang);
  await send(draft, lang);
  bot.sendMessage(TIAGO, '✅ ' + LANG[lang] + ' pronto!');
});

// Approve/Reject handler with Moltbook integration
bot.on('callback_query', async (q) => {
  const [action, id] = q.data.split('_');
  const p = drafts.get(id);
  if (!p) return bot.answerCallbackQuery(q.id, { text: 'Draft não encontrado.' });
  
  if (action === 'a') {
    // Save to approved queue
    const approvedPath = path.join(__dirname, 'approved-queue.json');
    const queue = fs.existsSync(approvedPath) ? JSON.parse(fs.readFileSync(approvedPath, 'utf-8')) : [];
    queue.push({ ...p, approvedAt: new Date().toISOString(), id });
    fs.writeFileSync(approvedPath, JSON.stringify(queue, null, 2));
    
    // Post to Moltbook
    const result = await postToMoltbook(p.draft, p.lang || 'en');
    
    const statusMsg = result.success 
      ? '✅ *APROVADO & POSTADO* no Moltbook!\n\nPost ID: ' + result.postId + '\n\n' + p.draft
      : '✅ *APROVADO* mas falhou no Moltbook: ' + result.error + '\n\n' + p.draft;
    
    bot.editMessageText(statusMsg, { 
      chat_id: q.message.chat.id, 
      message_id: q.message.message_id,
      parse_mode: 'Markdown'
    });
    drafts.delete(id);
    
  } else if (action === 'r') {
    bot.editMessageText('❌ *REJEITADO*\n\n' + p.draft, { 
      chat_id: q.message.chat.id, 
      message_id: q.message.message_id 
    });
    drafts.delete(id);
  }
  
  bot.answerCallbackQuery(q.id);
});

// Check Nex status on Moltbook
bot.onText(/\/status/, async (msg) => {
  if (msg.chat.id.toString() !== TIAGO) return;
  
  if (!MOLTBOOK_KEY) {
    return bot.sendMessage(TIAGO, '❌ MOLTBOOK_API_KEY não configurado.\nAdicione ao .env para ativar integração.');
  }
  
  try {
    const res = await fetch('https://api.moltbook.com/agents/me', {
      headers: { 'Authorization': 'Bearer ' + MOLTBOOK_KEY }
    });
    const agent = await res.json();
    
    bot.sendMessage(TIAGO, 
      '🦞⚡ *NEX STATUS*\n\n' +
      '• Nome: ' + (agent.name || 'Nex') + '\n' +
      '• Karma: ' + (agent.karma || 0) + '\n' +
      '• Posts: ' + (agent.post_count || 0) + '\n' +
      '• Followers: ' + (agent.follower_count || 0),
      { parse_mode: 'Markdown' }
    );
  } catch(e) {
    bot.sendMessage(TIAGO, '❌ Erro ao consultar Moltbook: ' + e.message);
  }
});

console.log('🦞⚡ Nex + Moltbook integration ready...');
console.log('Moltbook API:', MOLTBOOK_KEY ? '✅ Configured' : '⏳ Pending setup');
module.exports = { bot, gen, send, postToMoltbook };
