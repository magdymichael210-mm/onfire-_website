USE railway;

ALTER TABLE users
  ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN verification_token_hash CHAR(64) NULL,
  ADD COLUMN verification_expires_at DATETIME NULL;

-- الحسابات الموجودة حاليًا لا تحتاج رسالة تفعيل جديدة.
UPDATE users SET email_verified = 1 WHERE email_verified = 0;
