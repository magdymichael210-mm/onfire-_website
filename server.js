const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const db  = require('./db');
const app = express();

// ─── مجلدات الرفع ────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
const thumbsDir  = path.join(__dirname, 'uploads', 'thumbnails');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(thumbsDir))  fs.mkdirSync(thumbsDir);

// ─── Multer Config ────────────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') cb(null, thumbsDir);
    else cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: videoStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowed = /\.(mp4|mkv|avi|mov|webm)$/i;
      if (allowed.test(path.extname(file.originalname))) cb(null, true);
      else cb(new Error('نوع الفيديو غير مدعوم — المسموح: mp4, mkv, avi, mov, webm'));
    } else if (file.fieldname === 'thumbnail') {
      const allowed = /\.(jpg|jpeg|png|webp)$/i;
      if (allowed.test(path.extname(file.originalname))) cb(null, true);
      else cb(new Error('نوع الصورة غير مدعوم — المسموح: jpg, png, webp'));
    } else {
      cb(null, false);
    }
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ─── خدمة الموقع نفسه ──────────────────────────────────────────
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index_with_login_5 (3).html'));
});

// ─── Test ────────────────────────────────────────────────────
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1+1 as result');
    res.json({ ok: true, db: rows[0].result });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ─── تسجيل مستخدم جديد ───────────────────────────────────────
app.post('/api/register', async (req, res) => {
  console.log('📥 Register request:', req.body);
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password)
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

  if (password.length < 6)
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [full_name, email, hashed]
    );

    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User created:', result.insertId);
    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { id: result.insertId, full_name, email }
    });

  } catch (err) {
    console.error('❌ Register Error:', err.code, err.message, err.sqlMessage);
    res.status(500).json({ message: 'خطأ في السيرفر: ' + (err.sqlMessage || err.message) });
  }
});

// ─── تسجيل الدخول ────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  console.log('📥 Login request:', req.body);
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', user.id);
    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, full_name: user.full_name, email: user.email }
    });

  } catch (err) {
    console.error('❌ Login Error:', err.message);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});

// ─── إعادة تعيين كلمة المرور ─────────────────────────────────
app.post('/api/reset-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'جميع الحقول مطلوبة' });

  if (password.length < 6)
    return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length === 0)
      return res.status(404).json({ message: 'البريد الإلكتروني غير مسجل' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email]);

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('❌ Reset Error:', err.message);
    res.status(500).json({ message: 'خطأ في السيرفر' });
  }
});


// ─── Middleware: التحقق من التوكن ────────────────────────────
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح — يجب تسجيل الدخول' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(403).json({ message: 'التوكن غير صالح أو منتهي الصلاحية' });
  }
}

// ─── رفع فيديو ───────────────────────────────────────────────
app.post('/api/courses/upload', verifyToken, (req, res, next) => {
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ message: 'حجم الفيديو يتجاوز الحد المسموح (2GB)' });
      return res.status(400).json({ message: 'خطأ في رفع الملف: ' + err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { title, description, duration, subject, subject_color, subject_emoji } = req.body;
    const videoFile = req.files?.['video']?.[0];
    const thumbFile = req.files?.['thumbnail']?.[0];

    if (!title || !title.trim())
      return res.status(400).json({ message: 'عنوان الفيديو مطلوب' });
    if (!videoFile)
      return res.status(400).json({ message: 'ملف الفيديو مطلوب' });
    if (!subject)
      return res.status(400).json({ message: 'يرجى اختيار المادة' });

    const [result] = await db.query(
      'INSERT INTO courses (title, description, video_filename, thumbnail, duration, subject, subject_color, subject_emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title.trim(), description?.trim() || '', videoFile.filename, thumbFile?.filename || null, duration?.trim() || '', subject, subject_color || '#1a2b4a', subject_emoji || '📚']
    );

    console.log('✅ Video uploaded:', videoFile.filename, 'by user:', req.user.id);
    res.status(201).json({
      message: 'تم رفع الفيديو بنجاح',
      course: { id: result.insertId, title, video: videoFile.filename, thumbnail: thumbFile?.filename || null }
    });
  } catch (err) {
    console.error('❌ Upload Error:', err.message);
    res.status(500).json({ message: 'خطأ في قاعدة البيانات: ' + err.message });
  }
});

// ─── جلب كل الكورسات ─────────────────────────────────────────
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, title, description, video_filename, thumbnail, duration, subject, subject_color, subject_emoji, views, created_at FROM courses ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب الكورسات' });
  }
});

// ─── زيادة المشاهدات ──────────────────────────────────────────
app.post('/api/courses/:id/view', async (req, res) => {
  await db.query('UPDATE courses SET views = views + 1 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ─── تشغيل السيرفر ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
});
