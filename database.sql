-- إنشاء قاعدة البيانات
CREATE DATABASE IF NOT EXISTS onfire_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE onfire_db;

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token_hash CHAR(64),
  verification_expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول الكورسات
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  video_filename VARCHAR(255) NOT NULL,
  thumbnail VARCHAR(255),
  subject VARCHAR(100),
  subject_color VARCHAR(20),
  subject_emoji VARCHAR(10),
  instructor_id INT,
  duration VARCHAR(20),
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);
