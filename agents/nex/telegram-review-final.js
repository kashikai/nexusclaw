require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const TIAGO = process.env.TIAGO_TELEGRAM_ID;
const API_KEY = process.env.OPENROUTER_API_KEY;
const drafts = new Map();

const LANG = { pt: 'PT', en: 'EN', ko: 'KO', es: 'ES', jp: 'JP' };

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
{ role: 'system', content: 'You are Nex, NexusClaw community agent. Write in ' + LANG[lang] + '. Energetic but credible.' },
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

bot.onText(/\/gen (pt|en|ko|es|jp) (.+)/, async (msg, match) => {
if (msg.chat.id.toString() !== TIAGO) return;
const lang = match[1], update = match[2];
bot.sendMessage(TIAGO, '🦞 Gerando ' + LANG[lang] + '...');
const draft = await gen(update, lang);
await send(draft, lang);
bot.sendMessage(TIAGO, '✅ ' + LANG[lang] + ' pronto!');
});

bot.on('callback_query', async (q) => {
const [action, id] = q.data.split('_');
const p = drafts.get(id);
if (!p) return;
const txt = (action === 'a' ? '✅ APROVADO' : '❌ REJEITADO') + '\n\n' + p.draft;
bot.editMessageText(txt, { chat_id: q.message.chat.id, message_id: q.message.message_id });
drafts.delete(id);
bot.answerCallbackQuery(q.id);
});

console.log('🦞⚡ Nex Multilingual running...');
