require("dotenv").config();
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('message', (msg) => {
  console.log('Msg:', msg.text, 'Chat:', msg.chat.id);
  bot.sendMessage(msg.chat.id, '✅ Funcionando! Chat ID: ' + msg.chat.id);
});
