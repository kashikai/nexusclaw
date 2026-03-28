const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
console.log('Starting Nex Bot with OpenRouter...');
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const pendingDrafts = new Map();
// Generate draft using OpenRouter
async function generateDraft(techUpdate, postType, language) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nexusclaw.vercel.app'
            },
            body: JSON.stringify({
                model: 'moonshotai/kimi-k2.5',
                max_tokens: 300,
                messages: [
                    { role: 'system', content: 'You are Nex, NexusClaw community agent. Energetic but credible. Hook/Body/CTA/Tags format. No price promises.' },
                    { role: 'user', content: 'Tech update: ' + techUpdate + '\n\nGenerate community post in ' + language }
                ]
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
    catch (error) {
        console.error('API error:', error);
        return '🦞⚡ Update:\n\n' + techUpdate + '\n\n#NexusClaw';
    }
}
// Send draft for review
async function sendDraftForReview(draftText, postType, language) {
    const draftId = Date.now().toString();
    pendingDrafts.set(draftId, { draft: draftText, type: postType, lang: language });
    const message = '🦞⚡ *NEX DRAFT — Aguardando Aprovação*\n\n*Tipo:* ' + postType + '\n*Idioma:* ' + language.toUpperCase() + '\n\n*Draft:*\n' + draftText + '\n\n*ID:* ' + draftId;
    await bot.sendMessage(TIAGO_CHAT_ID, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                    { text: '✅ Aprovar', callback_data: 'approve_' + draftId },
                    { text: '✏️ Editar', callback_data: 'edit_' + draftId },
                    { text: '❌ Rejeitar', callback_data: 'reject_' + draftId }
                ]]
        }
    });
    console.log('Draft ' + draftId + ' sent');
}
// Commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '🦞⚡ Nex online!\n/draft <texto> — Manual\n/generate <update> — Com IA');
});
bot.onText(/\/draft (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== TIAGO_CHAT_ID)
        return;
    await sendDraftForReview(match[1].trim(), 'manual', 'pt');
    await bot.sendMessage(TIAGO_CHAT_ID, '✅ Draft enviado!');
});
bot.onText(/\/generate (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== TIAGO_CHAT_ID)
        return;
    await bot.sendMessage(TIAGO_CHAT_ID, '🦞⚡ Gerando com Kimi K2...');
    const draft = await generateDraft(match[1].trim(), 'update', 'pt');
    await sendDraftForReview(draft, 'generated', 'pt');
    await bot.sendMessage(TIAGO_CHAT_ID, '✅ Draft gerado pela IA!');
});
// Button handlers
bot.on('callback_query', async (query) => {
    const parts = query.data.split('_');
    const action = parts[0];
    const draftId = parts[1];
    const pending = pendingDrafts.get(draftId);
    if (!pending) {
        await bot.answerCallbackQuery(query.id, { text: 'Draft não encontrado.' });
        return;
    }
    if (action === 'approve') {
        const approvedPath = path.join(__dirname, 'approved-queue.json');
        const queue = fs.existsSync(approvedPath) ? JSON.parse(fs.readFileSync(approvedPath, 'utf-8')) : [];
        queue.push({ ...pending, approvedAt: new Date().toISOString(), id: draftId });
        fs.writeFileSync(approvedPath, JSON.stringify(queue, null, 2));
        await bot.editMessageText('✅ *APROVADO*\n\n' + pending.draft, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
        pendingDrafts.delete(draftId);
    }
    else if (action === 'reject') {
        await bot.editMessageText('❌ *REJEITADO*\n\n' + pending.draft, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        });
        pendingDrafts.delete(draftId);
    }
    else if (action === 'edit') {
        await bot.answerCallbackQuery(query.id, { text: 'Envie texto editado.' });
    }
    await bot.answerCallbackQuery(query.id);
});
// NEX PAUSE / RESUME
bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== TIAGO_CHAT_ID)
        return;
    if (msg.text?.startsWith('/'))
        return;
    if (msg.text === 'NEX PAUSE') {
        await bot.sendMessage(TIAGO_CHAT_ID, '🛑 Pausando posts.');
    }
    else if (msg.text === 'NEX RESUME') {
        await bot.sendMessage(TIAGO_CHAT_ID, '✅ Nex resumido. 🦞⚡');
    }
});
console.log('Nex bot with OpenRouter running...');
module.exports = { bot, generateDraft, sendDraftForReview };
