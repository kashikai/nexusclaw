import TelegramBot from 'node-telegram-bot-api';
import { generateDraft, DraftInput } from './generate-draft';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TIAGO_CHAT_ID = process.env.TIAGO_TELEGRAM_ID!;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Store pending drafts
const pendingDrafts = new Map<string, { draft: string; input: DraftInput }>();

export async function sendDraftForReview(input: DraftInput): Promise<void> {
  const output = await generateDraft(input);
  const draftId = Date.now().toString();

  pendingDrafts.set(draftId, { draft: output.draft, input });

  const message = \`🦞⚡ *NEX DRAFT — Aguardando Aprovação*

*Tipo:* \${input.postType}
*Idioma:* \${input.language.toUpperCase()}
*Urgência:* \${input.urgency}

*Update técnico:*
\`\`\`\n\${input.techUpdate}
\`\`\`

*Draft gerado:*
\`\`\`\n\${output.draft}
\`\`\`

*Gerado em:* \${new Date(output.generatedAt).toLocaleString('pt-BR', { timeZone: 'Asia/Tokyo' })} JST\`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Aprovar', callback_data: \`approve:\${draftId}\` },
        { text: '❌ Rejeitar', callback_data: \`reject:\${draftId}\` }
      ],
      [
        { text: '📝 Editar', callback_data: \`edit:\${draftId}\` }
      ]
    ]
  };

  await bot.sendMessage(TIAGO_CHAT_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });

  console.log(\`Draft \${draftId} sent for review\`);
}

// Handle button clicks
bot.on('callback_query', async (query) => {
  const [action, draftId] = query.data!.split(':');
  const pending = pendingDrafts.get(draftId);

  if (!pending) {
    await bot.answerCallbackQuery(query.id, { text: 'Draft não encontrado ou expirado' });
    return;
  }

  if (action === 'approve') {
    // Queue for Moltbook posting
    await queueForMoltbook(draftId, pending);
    await bot.answerCallbackQuery(query.id, { text: '✅ Aprovado! Agendado para Moltbook' });
    await bot.editMessageText(
      query.message!.text + '\n\n✅ *APROVADO* — Publicado em Moltbook',
      {
        chat_id: TIAGO_CHAT_ID,
        message_id: query.message!.message_id,
        parse_mode: 'Markdown'
      }
    );
    pendingDrafts.delete(draftId);

  } else if (action === 'reject') {
    await bot.answerCallbackQuery(query.id, { text: '❌ Rejeitado' });
    await bot.editMessageText(
      query.message!.text + '\n\n❌ *REJEITADO*',
      {
        chat_id: TIAGO_CHAT_ID,
        message_id: query.message!.message_id,
        parse_mode: 'Markdown'
      }
    );
    pendingDrafts.delete(draftId);

  } else if (action === 'edit') {
    await bot.answerCallbackQuery(query.id, { text: '📝 Envie o texto editado como resposta' });
    // TODO: Implement edit flow
  }
});

async function queueForMoltbook(draftId: string, pending: { draft: string; input: DraftInput }): Promise<void> {
  // TODO: Implement Moltbook API integration
  const queuePath = path.join(__dirname, 'moltbook-queue.json');
  const queue = fs.existsSync(queuePath) ? JSON.parse(fs.readFileSync(queuePath, 'utf-8')) : [];
  
  queue.push({
    id: draftId,
    draft: pending.draft,
    language: pending.input.language,
    approvedAt: new Date().toISOString(),
    status: 'pending_post'
  });
  
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  console.log(\`Draft \${draftId} queued for Moltbook\`);
}

// Start bot
if (require.main === module) {
  console.log('🦞⚡ NEX Telegram Review Bot started');
  console.log('Waiting for drafts...');
}

export { bot, sendDraftForReview };
