const router  = require('express').Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Отключаем лимитер на время тестов или поднимаем max до 100,
// потому что Render без специальной настройки app.set('trust proxy', 1)
// видит IP самого Render, а не пользователя, и банит ВООБЩЕ ВСЕХ после 5 кликов.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Подняли лимит для тестов
  message: { error: 'Забагато повідомлень. Спробуй пізніше.' },
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Для порта 587 secure должно быть строго FALSE
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // 16 букв без пробелов
  },
  tls: {
    // Этот блок заставляет Nodemailer игнорировать внутренние ограничения сети Render
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 10000, // Оставляем тайм-аут, чтобы не вешать сервер
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

    try {
      console.log("Попытка отправки почты для:", email); // Лог в панель Render

      await transporter.sendMail({
        from: `"CyberField NeT сайт" <${process.env.GMAIL_USER}>`,
        to: process.env.CONTACT_TO_EMAIL || process.env.GMAIL_USER,
        replyTo: email,
        subject: `Нове повідомлення з сайту від ${fname} ${lname || ''}`.trim(),
        text: [
          `Ім'я: ${fname} ${lname || ''}`,
          `Email: ${email}`,
          `Телефон: ${phone || '—'}`,
          `Курс: ${course || '—'}`,
          '',
          'Повідомлення:',
          msg,
        ].join('\n'),
      });

      console.log("Письмо успешно улетело!");
      // Возвращаем статус 200, чтобы фронтенд убрал надпись "Надсилання..."
      return res.status(200).json({ ok: true });

    } catch (err) {
      console.error('Contact form email error:', err.message);
      // Если упало — отдаем 500 ошибку, чтобы фронтенд вывел alert, а не зависал
      return res.status(500).json({ error: 'Не вдалося надіслати повідомлення: ' + err.message });
    }
  }
);

module.exports = router;