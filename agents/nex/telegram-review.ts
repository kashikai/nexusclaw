const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID;

console.log('Starting Nex Bot with buttons...');
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingDrafts = new Map();

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🦞⚡ Nex online! Use /draft <texto> para testar.');
});

// /draft <texto> — MUST come before bot.on('message')
bot.onText(/\/draft (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== TIAGO_CHAT_ID) return;
  const draftText = match[1].trim();
  await sendDraftForReview(draftText, 'test', 'en');
  await bot.sendMessage(TIAGO_CHAT_ID, '✅ Draft enviado para revisão!');
});

// Send draft for review
async function sendDraftForReview(draftText, postType = 'update', language = 'en') {
  const draftId = Date.now().toString();
  pendingDrafts.set(draftId, { draft: draftText, type: postType, lang: language });

  const message = `🦞⚡ *NEX DRAFT — Aguardando Aprovação*

*Tipo:* ${postType}
*Idioma:* ${language.toUpperCase()}

*Draft:*
${draftText}

*ID:* ${draftId}`;

  await bot.sendMessage(TIAGO_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Aprovar', callback_data: `approve_${draftId}` },
        { text: '✏️ Editar', callback_data: `edit_${draftId}` },
        { text: '❌ Rejeitar', callback_data: `reject_${draftId}` }
      ]]
    }
  });

  console.log(`Draft ${draftId} sent for review`);
}

// Handle button clicks
bot.on('callback_query', async (query) => {
  const parts = query.data.split('_');
  const action = parts[0];
  const draftId = parts[1];
  const pending = pendingDrafts.get(draftId);

  if (!pending) {
    await bot.answerCallbackQuery(query.id, { text: 'Draft não encontrado ou já processado.' });
    return;
  }

  if (action === 'approve') {
    const approvedPath = path.join(__dirname, 'approved-queue.json');
    const queue = fs.existsSync(approvedPath)
      ? JSON.parse(fs.readFileSync(approvedPath, 'utf-8'))
      : [];
    queue.push({ ...pending, approvedAt: new Date().toISOString(), id: draftId });
    fs.writeFileSync(approvedPath, JSON.stringify(queue, null, 2));

    await bot.editMessageText(
      `✅ *APROVADO* — Draft adicionado à fila do Moltbook.\n\n${pending.draft}`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' }
    );
    pendingDrafts.delete(draftId);

  } else if (action === 'reject') {
    await bot.editMessageText(
      `❌ *REJEITADO* — Draft descartado.\n\n${pending.draft}`,
      { chat_id: query.message.chat.id, message_id: query.message.message_id, parse_mode: 'Markdown' }
    );
    pendingDrafts.delete(draftId);

  } else if (action === 'edit') {
    await bot.answerCallbackQuery(query.id, { text: 'Envie o texto editado como resposta.' });
    await bot.sendMessage(
      query.message.chat.id,
      `✏️ *EDITAR DRAFT ${draftId}*\n\nEnvie o texto final aprovado:`,
      { parse_mode: 'Markdown' }
    );
  }

  await bot.answerCallbackQuery(query.id);
});

// Handle text messages (NEX PAUSE/RESUME only)
bot.on('message', async (msg) => {
  if (msg.chat.id.toString() !== TIAGO_CHAT_ID) return;
  if (msg.text?.startsWith('/')) return; // ignora comandos — já tratados acima

  if (msg.text === 'NEX PAUSE') {
    await bot.sendMessage(TIAGO_CHAT_ID, '🛑 Entendido. Pausando posts. Aguardando Tiago.');
    process.env.NEX_PAUSED = 'true';
  } else if (msg.text === 'NEX RESUME') {
    await bot.sendMessage(TIAGO_CHAT_ID, '✅ Nex resumido. Voltando ao fluxo normal. 🦞⚡');
    process.env.NEX_PAUSED = 'false';
  }
});

console.log('Nex Telegram review bot running with buttons...');
module.exports = { bot, sendDraftForReview };
