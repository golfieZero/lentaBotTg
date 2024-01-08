const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ]
});

const botToken = process.env.BOT_TOKEN;
const bot = new Telegraf(botToken);

app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
  logger.info('Received update from webhook.');
});

const subscriptions = {};

bot.command('start', (ctx) => {
  ctx.reply('Привет! Я бот, который отправляет новые сообщения из выбранных каналов. Для начала отправьте мне ссылку на канал (или его username) командой /subscribe.');
  logger.info(`User ${ctx.from.id} started the bot.`);
});

bot.command('subscribe', async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text.split(' ')[1];

  try {
    const chatInfo = await ctx.telegram.getChat(messageText);
    ctx.reply(`Вы подписались на канал "${chatInfo.title}". Теперь я буду отправлять вам сообщения из него.`);
    subscriptions[chatId] = chatInfo;
    logger.info(`User ${ctx.from.id} subscribed to channel ${chatInfo.title}.`);
  } catch (error) {
    ctx.reply(`Ошибка при подписке на канал: ${error.message}`);
    logger.error(`Error subscribing user ${ctx.from.id} to channel: ${error.message}`);
  }
});

bot.on('message', (ctx) => {
  const chatId = ctx.chat.id;
  if (userIsSubscribed(chatId)) {
    try {
      const messageId = ctx.message.message_id;
      const fromChatId = subscriptions[chatId].id;
      ctx.telegram.forwardMessage(chatId, fromChatId, messageId);
      logger.info(`Forwarded message from channel ${subscriptions[chatId].title} to user ${ctx.from.id}.`);
    } catch (error) {
      logger.error(`Error forwarding message to user ${ctx.from.id}: ${error.message}`);
    }
  }
});

function userIsSubscribed(chatId) {
  return subscriptions.hasOwnProperty(chatId);
}

bot.launch();

const PORT = 8443;
const WEBHOOK_URL = `https://194.87.111.47:${PORT}/webhook`;

bot.telegram.setWebhook(WEBHOOK_URL);
logger.info(`Webhook is set up at ${WEBHOOK_URL}`);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
