-- ==========================================================================
-- database.sql — Beacon Help Center (MySQL schema + seed data)
-- Import this file via phpMyAdmin, or: mysql -u root -p < database.sql
-- ==========================================================================


SET FOREIGN_KEY_CHECKS = 0;

-- ---------- categories ----------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

-- ---------- faqs ----------
DROP TABLE IF EXISTS faqs;
CREATE TABLE faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  tags VARCHAR(255) DEFAULT '',
  date_added DATE NOT NULL,
  helpful_count INT DEFAULT 0,
  views INT DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- admins ----------
DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- ---------- contact_messages ----------
DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new','read','replied') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- newsletter_subscribers ----------
DROP TABLE IF EXISTS newsletter_subscribers;
CREATE TABLE newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- seed: categories ----------
INSERT INTO categories (id, name, icon) VALUES
('general', 'General', 'fa-compass'),
('account', 'Account', 'fa-user-gear'),
('payment', 'Payment', 'fa-credit-card'),
('orders', 'Orders', 'fa-box'),
('technical', 'Technical', 'fa-screwdriver-wrench'),
('privacy', 'Privacy', 'fa-user-shield'),
('security', 'Security', 'fa-shield-halved'),
('support', 'Support', 'fa-life-ring');

-- ---------- seed: faqs ----------
INSERT INTO faqs (id, question, answer, category_id, tags, date_added, helpful_count, views) VALUES
(1, 'What is Beacon Help Center?', 'Beacon is a self-serve help center where you can search for answers, browse guides by category, and reach our support team if you''re still stuck.', 'general', 'intro,overview', '2026-01-05', 42, 980),
(2, 'Is Beacon free to use?', 'Yes. Browsing articles, searching the help center, and contacting support are completely free for every visitor.', 'general', 'pricing,free', '2026-01-06', 31, 640),
(3, 'Which browsers are supported?', 'Beacon works on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.', 'general', 'browser,compatibility', '2026-01-07', 18, 410),
(4, 'Can I use Beacon on my phone?', 'Absolutely — the help center is fully responsive and can even be installed as an app on your home screen.', 'general', 'mobile,pwa', '2026-01-08', 27, 505),
(5, 'How do I switch the interface language?', 'Use the language switcher in the navbar to toggle between English and Hindi. Your choice is remembered on this device.', 'general', 'language,hindi', '2026-01-09', 15, 300),
(6, 'How do I create an account?', 'Click Sign Up in the navbar, enter your email and a password, and confirm your email address to activate the account.', 'account', 'signup,register', '2026-01-10', 39, 720),
(7, 'How do I reset my password?', 'Go to the login screen and select Forgot Password. We''ll email you a secure link to set a new password.', 'account', 'password,reset', '2026-01-11', 55, 1120),
(8, 'How do I update my profile details?', 'Open Account Settings from your profile menu, edit the fields you''d like to change, and click Save.', 'account', 'profile,settings', '2026-01-12', 21, 380),
(9, 'How do I delete my account?', 'Go to Account Settings, scroll to Danger Zone, and select Delete Account. This action is permanent and removes all your data.', 'account', 'delete,close account', '2026-01-13', 24, 460),
(10, 'Can I merge two accounts?', 'Account merging isn''t automated yet. Contact support with both account emails and we''ll assist manually.', 'account', 'merge,duplicate', '2026-01-14', 9, 190),
(11, 'Why was I logged out automatically?', 'Sessions expire after 30 days of inactivity, or immediately if you change your password, for your security.', 'account', 'session,logout', '2026-01-15', 12, 220),
(12, 'What payment methods are accepted?', 'We accept all major credit and debit cards, UPI, net banking, and popular wallets at checkout.', 'payment', 'billing,cards', '2026-01-16', 33, 610),
(13, 'How do I update my billing information?', 'Go to Billing under Account Settings, select Update Payment Method, and enter your new card details.', 'payment', 'billing,update', '2026-01-17', 20, 350),
(14, 'Why did my payment fail?', 'Payments usually fail due to insufficient funds, an expired card, or your bank blocking the transaction. Try another method or contact your bank.', 'payment', 'failed,error', '2026-01-18', 28, 500),
(15, 'How do I request a refund?', 'Open a support ticket with your order ID within 14 days of purchase and our billing team will review your request.', 'payment', 'refund,money back', '2026-01-19', 45, 860),
(16, 'Where can I find my invoices?', 'All invoices are available under Billing History in your account, and can be downloaded as PDF.', 'payment', 'invoice,receipt', '2026-01-20', 17, 300),
(17, 'How do I track my order?', 'Go to Orders in your account dashboard and click Track on any order to see real-time status updates.', 'orders', 'tracking,status', '2026-01-21', 37, 700),
(18, 'Can I cancel an order after placing it?', 'Orders can be cancelled within 1 hour of placement from the Orders page. After that, contact support directly.', 'orders', 'cancel,order', '2026-01-22', 22, 400),
(19, 'How do I change my delivery address?', 'If the order hasn''t shipped yet, edit the address from Orders > Order Details > Edit Address.', 'orders', 'address,delivery', '2026-01-23', 14, 260),
(20, 'What is your return policy?', 'Items can be returned within 30 days in original condition. Start a return from the Orders page to get a prepaid label.', 'orders', 'return,policy', '2026-01-24', 30, 540),
(21, 'Why is my order delayed?', 'Delays are usually caused by high demand or courier disruptions. Check the tracking page for the latest estimated delivery date.', 'orders', 'delay,shipping', '2026-01-25', 19, 320),
(22, 'The website isn''t loading properly, what should I do?', 'Try clearing your browser cache, disabling extensions, or switching browsers. If the issue continues, let support know your browser and OS.', 'technical', 'bug,loading', '2026-01-26', 25, 470),
(23, 'I found a bug — how do I report it?', 'Use the Contact Support form and select Bug Report as the subject. Include steps to reproduce and a screenshot if possible.', 'technical', 'bug report,feedback', '2026-01-27', 16, 280),
(24, 'Does Beacon work offline?', 'Yes, previously visited pages are cached and remain viewable offline thanks to the built-in service worker.', 'technical', 'offline,pwa', '2026-01-28', 13, 240),
(25, 'How do I install Beacon as an app?', 'On supported browsers, click the Install icon in the address bar, or use Add to Home Screen on mobile.', 'technical', 'install,pwa', '2026-01-29', 11, 210),
(26, 'Can I use keyboard shortcuts?', 'Press / to jump to search, Esc to close any open panel, and Ctrl+K to open the AI assistant.', 'technical', 'shortcuts,keyboard', '2026-01-30', 8, 150),
(27, 'What data does Beacon collect about me?', 'We only collect what''s needed to run your account: your email, basic usage analytics, and support conversations. See our Privacy Policy for details.', 'privacy', 'data,gdpr', '2026-02-01', 26, 430),
(28, 'Can I download a copy of my data?', 'Yes, request a data export from Account Settings > Privacy, and we''ll email you a download link within 48 hours.', 'privacy', 'export,data', '2026-02-02', 14, 250),
(29, 'Do you sell my data to third parties?', 'No. We never sell personal data. Some anonymised analytics may be shared with service providers strictly to operate the platform.', 'privacy', 'third party,data sale', '2026-02-03', 29, 480),
(30, 'How do I enable two-factor authentication?', 'Go to Account Settings > Security and turn on Two-Factor Authentication, then scan the QR code with an authenticator app.', 'security', '2fa,authentication', '2026-02-04', 34, 590),
(31, 'I think my account was hacked, what do I do?', 'Reset your password immediately, enable two-factor authentication, and contact support so we can review recent account activity.', 'security', 'hacked,compromised', '2026-02-05', 41, 710),
(32, 'How do I see my active login sessions?', 'Visit Account Settings > Security > Active Sessions to view and revoke access from any device.', 'security', 'sessions,devices', '2026-02-06', 10, 190),
(33, 'How can I contact support?', 'Use the Contact Support form on this page, chat with the assistant, or email us — we usually reply within one business day.', 'support', 'contact,help', '2026-02-07', 36, 660),
(34, 'What are your support hours?', 'Our team is available Monday to Saturday, 9 AM to 8 PM IST. The AI assistant is available around the clock.', 'support', 'hours,availability', '2026-02-08', 12, 230),
(35, 'Do you offer phone support?', 'Phone support is available for Pro and Enterprise plans. Everyone else can reach us via the contact form or chat.', 'support', 'phone,priority', '2026-02-09', 9, 170);

-- ---------- seed: admin (username: admin / password: admin123) ----------
INSERT INTO admins (username, password_hash) VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

SET FOREIGN_KEY_CHECKS = 1;
