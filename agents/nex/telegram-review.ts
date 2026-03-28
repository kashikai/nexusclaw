const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID;

console.log('Starting Nex Bot...');
console.log('Token:', BOT_TOKEN ? '***' : 'MISSING');
console.log('Chat ID:', TIAGO_CHAT_ID);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingDrafts = new Map();

// Test command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🦞⚡ Nex online! Aguardando drafts para revisão.');
});

// Handle messages
bot.on('message', (msg) => {
  console.log('Message from', msg.chat.id, ':', msg.text);
  
  if (msg.chat.id.toString() === TIAGO_CHAT_ID) {
    // This is Tiago
    if (msg.text === 'NEX PAUSE') {
      bot.sendMessage(TIAGO_CHAT_ID, '🛑 Entendido. Pausando posts.');
    } else if (msg.text === 'NEX RESUME') {
      bot.sendMessage(TIAGO_CHAT_ID, '✅ Nex resumido. 🦞⚡');
    }
  }
});

// Handle button clicks
bot.on('callback_query', async (query) => {
  console.log('Button clicked:', query.data);
  const [action, draftId] = query.data.split('_');
  
  if (action === 'approve') {
    await bot.editMessageText('✅ *APROVADO*', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: 'Markdown'
    });
  } else if (action === 'reject') {
    await bot.editMessageText('❌ *REJEITADO*', {
      chat_id: query.message.chat.id,
      message_id: query.message.message_id,
      parse_mode: 'Markdown'
    });
  }
  
  await bot.answerCallbackQuery(query.id);
});

console.log('Nex Telegram review bot running...');

// Export for use
module.exports = { bot };
