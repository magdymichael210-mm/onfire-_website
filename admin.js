const express = require('express');
const bcrypt  = require('bcryptjs');
require('dotenv').config();

const db  = require('./db');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Admin Page ───────────────────────────────────────────────
app.get('/', async (req, res) => {
  const [users] = await db.query('SELECT id, full_name, email, created_at FROM users');

  const rows = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
      <td>
        <form method="POST" action="/reset" style="display:flex;gap:8px;align-items:center">
          <input type="hidden" name="email" value="${u.email}">
          <input type="password" name="password" placeholder="باسورد جديد" required minlength="6"
            style="padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px">
          <button type="submit" style="padding:6px 14px;background:#1e3a5f;color:white;border:none;border-radius:6px;cursor:pointer">تغيير</button>
        </form>
      </td>
    </tr>
  `).join('');

  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Admin Panel - On Fire</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; padding: 30px; direction: rtl; }
    h1 { color: #1e3a5f; margin-bottom: 24px; font-size: 24px; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    th { background: #1e3a5f; color: white; padding: 14px 16px; text-align: right; font-size: 14px; }
    td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f9fafb; }
    .msg { padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <h1>⚙️ لوحة الإدارة — المستخدمين</h1>
  ${res.locals.msg ? `<div class="msg ${res.locals.type}">${res.locals.msg}</div>` : ''}
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>الاسم</th>
        <th>الإيميل</th>
        <th>تاريخ التسجيل</th>
        <th>تغيير كلمة المرور</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`);
});

// ─── Reset Password ───────────────────────────────────────────
app.post('/reset', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);
    if (result.affectedRows === 0) {
      res.locals.msg  = 'الإيميل غير موجود';
      res.locals.type = 'error';
    } else {
      res.locals.msg  = `✅ تم تغيير كلمة المرور لـ ${email}`;
      res.locals.type = 'success';
    }
  } catch (err) {
    res.locals.msg  = 'خطأ: ' + err.message;
    res.locals.type = 'error';
  }
  res.redirect('/?msg=' + encodeURIComponent(res.locals.msg));
});

app.get('/', async (req, res, next) => {
  if (req.query.msg) res.locals.msg = req.query.msg;
  next();
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Admin Panel شغال على http://localhost:${PORT}`);
});
