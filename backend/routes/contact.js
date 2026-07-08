const router  = require('express').Router();
const { Resend } = require('resend'); // Подключаем Resend вместо nodemailer
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const resend = new Resend(process.env.RESEND_API_KEY);

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

    try {
      console.log("Попытка отправки через Resend API...");

      // На бесплатном тарифе Resend без своего домена отправлять можно
      // СТРОГО с адреса 'onboarding@resend.dev' и СТРОГО на свою же личную почту.
      const { data, error } = await resend.emails.send({
        from: 'CyberField Сайт <onboarding@resend.dev>',
        to: process.env.CONTACT_TO_EMAIL || 'твоя-почта@gmail.com', // Подставь свою почту или возьмет из Render
        replyTo: email,
        subject: `Нове повідомлення від ${fname} ${lname || ''}`,
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

      if (error) {
        throw new Error(error.message);
      }

      console.log("Письмо успешно улетело через API!", data);
      return res.status(200).json({ ok: true });

    } catch (err) {
      console.error('Resend API error:', err.message);
      return res.status(500).json({ error: 'Не вдалося надіслати повідомлення: ' + err.message });
    }
  }
);

module.exports = router;