const { Telegraf } = require('telegraf');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ]
});

const bot = new Telegraf('6887521253:AAH-nn55oL0yNmjQAM3Ro0VtM11Sz0Wbq54');

const userSubscriptions = new Map();

bot.start((ctx) => {
  ctx.reply('Привет! Я бот, который пересылает сообщения из каналов. Просто отправьте мне ссылку на канал (или его username), и я начну отправлять вам сообщения из него.');
  logger.info(`User ${ctx.from.id} started the bot.`);
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const messageText = ctx.message.text;

  if (messageText.startsWith('https://t.me/') || messageText.startsWith('@')) {
    try {
      const chatInfo = await ctx.telegram.getChat(messageText);
      ctx.reply(`Вы подписались на канал "${chatInfo.title}". Теперь я буду отправлять вам сообщения из него.`);
      userSubscriptions.set(chatId, chatInfo);
      logger.info(`User ${ctx.from.id} subscribed to channel ${chatInfo.title}.`);
    } catch (error) {
      ctx.reply(`Ошибка при подписке на канал: ${error.message}`);
      logger.error(`Error subscribing user ${ctx.from.id} to channel: ${error.message}`);
    }
  } else {
    ctx.reply(`Пожалуйста, отправьте мне корректную ссылку на канал или его username.`);
    logger.warn(`User ${ctx.from.id} provided an incorrect channel link or username.`);
  }
});

bot.on('message', (ctx) => {
  const chatId = ctx.chat.id;

  if (userSubscriptions.has(chatId)) {
    const channelInfo = userSubscriptions.get(chatId);
    ctx.telegram.forwardMessage(chatId, channelInfo.id, ctx.message.message_id);
    logger.info(`Forwarded message from channel ${channelInfo.title} to user ${ctx.from.id}.`);
  }
});

// Обработка событий канала (channel_post)
bot.on('channel_post', (ctx) => {
  const channelPost = ctx.update.channel_post;
  logger.info(`Received channel post from channel ${channelPost.chat.username}.`);
});

bot.launch();
