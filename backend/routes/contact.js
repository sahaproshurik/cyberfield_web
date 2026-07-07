const router  = require('express').Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { error: 'Забагато повідомлень. Спробуй пізніше.' },
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
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

      res.json({ ok: true });
    } catch (err) {
      console.error('Contact form email error:', err.message);
      res.status(500).json({ error: 'Не вдалося надіслати повідомлення. Спробуй пізніше.' });
    }
  }
);

module.exports = router;
