const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

// Обработка входящих обновлений от вебхука
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

const subscriptions = {};

// Обработка команды /start
bot.command('start', (ctx) => {
  ctx.reply('Привет! Я бот, который отправляет новые сообщения из выбранных каналов. Для начала отправьте мне ссылку на канал (или его username) командой /subscribe.');
});

// Подписка на канал
bot.command('subscribe', async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text.split(' ')[1];

  try {
    const chatInfo = await ctx.telegram.getChat(messageText);
    ctx.reply(`Вы подписались на канал "${chatInfo.title}". Теперь я буду отправлять вам сообщения из него.`);
    subscriptions[chatId] = chatInfo;
  } catch (error) {
    ctx.reply(`Ошибка при подписке на канал: ${error.message}`);
  }
});

// Обработка входящих сообщений от подписанных каналов
bot.on('message', (ctx) => {
  const chatId = ctx.chat.id;
  // Проверяем, подписан ли пользователь на канал
  // Если да, отправляем ему сообщение из канала
  if (userIsSubscribed(chatId)) {
    ctx.telegram.forwardMessage(chatId, subscriptions[chatId].id, ctx.message.message_id);
  }
});

// Функция проверки подписки пользователя
function userIsSubscribed(chatId) {
  // Простая логика: проверяем, есть ли пользователь в подписках (без хранения в базе данных)
  return subscriptions.hasOwnProperty(chatId);
}

// Запуск бота
bot.launch();


// Установка вебхука
const PORT = 8443;
const WEBHOOK_URL = `https://194.87.111.47:${PORT}/webhook`;

bot.telegram.setWebhook(WEBHOOK_URL);

// Запуск express приложения
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
