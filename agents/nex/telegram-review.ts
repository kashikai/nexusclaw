const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID;

console.log('Starting Nex Bot with buttons...');
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingDrafts = new Map();

// /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🦞⚡ Nex online! Aguardando drafts para revisão.');
});

// Send draft for review (function to be called)
async function sendDraftForReview(draftText, postType = 'update', language = 'en') {
  const draftId = Date.now().toString();
  pendingDrafts.set(draftId, { draft: draftText, type: postType, lang: language });
  
  const message = `🦞⚡ *NEX DRAFT — Aguardando Aprovação*

*Tipo:* ${postType}
*Idioma:* ${language.toUpperCase()}

*Draft:*
${draftText}

*ID:* ${draftId}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Aprovar', callback_data: `approve_${draftId}` },
        { text: '✏️ Editar', callback_data: `edit_${draftId}` },
        { text: '❌ Rejeitar', callback_data: `reject_${draftId}` }
      ]
    ]
  };

  await bot.sendMessage(TIAGO_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  console.log(`Draft ${draftId} sent for review`);
}

// Handle button clicks
bot.on('callback_query', async (query) => {
  const [action, draftId] = query.data.split('_');
  const pending = pendingDrafts.get(draftId);
  
  console.log(`Action: ${action}, Draft: ${draftId}`);
  
  if (!pending) {
    await bot.answerCallbackQuery(query.id, { text: 'Draft não encontrado ou já processado.' });
    return;
  }

  if (action === 'approve') {
    // Save to approved queue
    const approvedPath = path.join(__dirname, 'approved-queue.json');
    const queue = fs.existsSync(approvedPath) 
      ? JSON.parse(fs.readFileSync(approvedPath, 'utf-8')) 
      : [];
    queue.push({ ...pending, approvedAt: new Date().toISOString(), id: draftId });
    fs.writeFileSync(approvedPath, JSON.stringify(queue, null, 2));
    
    await bot.editMessageText(
      `✅ *APROVADO* — Draft ${draftId} adicionado à fila do Moltbook.\n\n${pending.draft}`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );
    pendingDrafts.delete(draftId);
    
  } else if (action === 'reject') {
    await bot.editMessageText(
      `❌ *REJEITADO* — Draft ${draftId} descartado.\n\n${pending.draft}`,
      {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );
    pendingDrafts.delete(draftId);
    
  } else if (action === 'edit') {
    await bot.answerCallbackQuery(query.id, { text: 'Envie o texto editado como resposta a esta mensagem.' });
    await bot.sendMessage(
      query.message.chat.id,
      `✏️ *EDITAR DRAFT ${draftId}*\n\nEnvie o texto final aprovado:`,
      { parse_mode: 'Markdown' }
    );
  }
  
  await bot.answerCallbackQuery(query.id);
});

// Handle edited drafts (replies)
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== TIAGO_CHAT_ID) return;
  
  console.log('Message from Tiago:', msg.text);
  
  if (msg.text === 'NEX PAUSE') {
    await bot.sendMessage(TIAGO_CHAT_ID, '🛑 Entendido. Pausando posts. Aguardando Tiago.');
    process.env.NEX_PAUSED = 'true';
    
  } else if (msg.text === 'NEX RESUME') {
    await bot.sendMessage(TIAGO_CHAT_ID, '✅ Nex resumido. Voltando ao fluxo normal. 🦞⚡');
    process.env.NEX_PAUSED = 'false';
    
  } else if (msg.text?.startsWith('/draft')) {
    // Test command: /draft <text>
    const draftText = msg.text.replace('/draft', '').trim();
    if (draftText) {
      await sendDraftForReview(draftText, 'test', 'en');
      await bot.sendMessage(TIAGO_CHAT_ID, 'Draft enviado para revisão!');
    }
  }
});

console.log('Nex Telegram review bot running with buttons...');
module.exports = { bot, sendDraftForReview };
