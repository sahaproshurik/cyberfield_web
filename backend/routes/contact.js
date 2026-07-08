const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Забагато повідомлень. Спробуй пізніше.' },
});

router.post(
  '/',
  contactLimiter,
  [
    body('fname').trim().notEmpty().withMessage("Вкажи ім'я").isLength({ max: 100 }),
    body('lname').trim().optional({ checkFalsy: true }).isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Некоректний email').normalizeEmail(),
    body('phone').trim().optional({ checkFalsy: true }).isLength({ max: 30 }),
    body('course').trim().optional({ checkFalsy: true }).isLength({ max: 100 }),
    body('msg').trim().notEmpty().withMessage('Введи повідомлення').isLength({ max: 5000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { fname, lname, email, phone, course, msg } = req.body;

    // Форматируем красивый текст для Telegram
    const telegramMessage = [
      `🚀 *Нова заявка з сайту CyberField*`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 *Ім'я:* ${fname} ${lname || ''}`,
      `📧 *Email:* ${email}`,
      `📞 *Телефон:* ${phone || '—'}`,
      `📚 *Курс:* ${course || '—'}`,
      `💬 *Повідомлення:*`,
      `${msg}`
    ].join('\n');

    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      // Шлем обычный POST запрос на сервера Telegram API
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramMessage,
          parse_mode: 'Markdown' // Делает текст жирным и красивым
        })
      });

      const telegramData = await response.json();

      if (!telegramData.ok) {
        throw new Error(telegramData.description || 'Помилка Telegram API');
      }

      console.log("Заявка успешно улетела в Telegram!");
      return res.status(200).json({ ok: true });

    } catch (err) {
      console.error('Telegram send error:', err.message);
      return res.status(500).json({ error: 'Не вдалося надіслати повідомлення: ' + err.message });
    }
  }
);

module.exports = router;