# Beacon Help Center — MySQL Setup Guide

This project now stores FAQs, categories, views, helpful votes, contact
messages and newsletter signups in a real **MySQL** database, read and
written through small PHP scripts in the `/api` folder. Bookmarks,
favorites, likes, dark mode, language, and search history stay in the
browser's LocalStorage — those are personal device preferences, not
shared application data.

## 1. Install XAMPP (or WAMP/MAMP)
Download and install XAMPP: https://www.apachefriends.org
It bundles Apache (web server), MySQL, and PHP together — no separate
installs needed.

## 2. Copy the project into htdocs
Copy the whole `DynamicFAQHelpCenter` folder into XAMPP's `htdocs` folder:
- Windows: `C:\xampp\htdocs\DynamicFAQHelpCenter`
- Mac: `/Applications/XAMPP/htdocs/DynamicFAQHelpCenter`

## 3. Start Apache and MySQL
Open the **XAMPP Control Panel** and click **Start** next to both
**Apache** and **MySQL**.

## 4. Create the database — the easy way (one click)
Open this URL in your browser:

**http://localhost/DynamicFAQHelpCenter/setup.php**

It connects to MySQL, creates the `beacon_helpcenter` database, all 5
tables, and loads the seed data (8 categories, 35 FAQs, 1 admin
account) — all automatically. You'll see a green "Database is ready!"
message with a count of how many FAQs were loaded.

You can delete `setup.php` afterwards, or just leave it — running it
again simply recreates the same data.

### Alternative: manual import via phpMyAdmin
If you'd rather do it by hand (or `setup.php` doesn't work for some
reason):
1. Open http://localhost/phpmyadmin
2. Click **Import** in the top menu
3. Choose the `database.sql` file from the project folder
4. Click **Go**

## 5. Check the database credentials
Open `config.php` in the project folder. The defaults match a stock
XAMPP install (`root` user, blank password):

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'beacon_helpcenter');
define('DB_USER', 'root');
define('DB_PASS', '');
```

If your MySQL uses a different username/password, update these lines.

## 6. Open the site through Apache (not by double-clicking the file!)
Because the site now talks to PHP/MySQL, it must be opened through the
web server, not opened directly as a `file://` path.

Visit: **http://localhost/DynamicFAQHelpCenter/index.html**

## 7. Admin login
Go to **http://localhost/DynamicFAQHelpCenter/login.html**
- Username: `admin`
- Password: `admin123`

## Troubleshooting
- **Toast says "Couldn't reach the database"** → Apache or MySQL isn't
  running, or the database hasn't been imported yet. Check the XAMPP
  Control Panel.
- **Blank page / PHP code shown as text** → you opened the file
  directly instead of through `http://localhost/...`. PHP only runs
  through the Apache server.
- **Access denied for user 'root'** → your MySQL has a password set;
  update `DB_PASS` in `config.php`.

## What's still in `data.js` / `faq.json`?
Those two files are only kept as the original seed source used to
generate `database.sql` — the live site no longer reads them at
runtime.
