<?php
/* ==========================================================================
   setup.php — one-click database setup
   Open this file once in your browser (http://localhost/DynamicFAQHelpCenter/setup.php)
   and it creates the database, all tables, and loads the seed data for
   you automatically — no need to touch phpMyAdmin at all.
   ========================================================================== */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'beacon_helpcenter');

function render_page($title, $bodyHtml, $ok = true) {
  $color = $ok ? '#35C99B' : '#FF6B6B';
  echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>$title</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#0B1E33;color:#EAF2FA;
      display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;}
    .card{background:#122841;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:2.2rem;max-width:520px;width:100%;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);}
    h1{font-size:1.3rem;margin-top:0;color:$color;}
    p{color:#93A6BC;line-height:1.6;}
    code{background:rgba(255,255,255,.08);padding:.15rem .4rem;border-radius:5px;font-size:.85rem;}
    ul{color:#93A6BC;line-height:1.8;}
    a.btn{display:inline-block;margin-top:1rem;margin-right:.6rem;background:#FFB238;color:#0B1E33;
      text-decoration:none;padding:.65rem 1.3rem;border-radius:999px;font-weight:600;}
    a.btn.outline{background:transparent;border:1.5px solid rgba(255,255,255,.4);color:#fff;}
  </style></head><body><div class='card'>$bodyHtml</div></body></html>";
}

// Step 1: connect to MySQL server (no specific database yet)
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($conn->connect_error) {
  render_page('Setup failed', "
    <h1>❌ Couldn't connect to MySQL</h1>
    <p>Make sure <b>MySQL is started</b> in your XAMPP Control Panel, then reload this page.</p>
    <p style='font-size:.8rem;'>Error: " . htmlspecialchars($conn->connect_error) . "</p>
  ", false);
  exit;
}

// Step 2: read the SQL file
$sqlPath = __DIR__ . '/database.sql';
if (!file_exists($sqlPath)) {
  render_page('Setup failed', "
    <h1>❌ database.sql not found</h1>
    <p>Make sure <code>database.sql</code> is in the same folder as this file.</p>
  ", false);
  exit;
}
$sql = file_get_contents($sqlPath);

// Step 3: run every statement in database.sql (create DB, tables, seed data)
if ($conn->multi_query($sql)) {
  do {
    if ($result = $conn->store_result()) $result->free();
  } while ($conn->more_results() && $conn->next_result());
}

if ($conn->errno) {
  render_page('Setup finished with a warning', "
    <h1>⚠️ Setup ran, but MySQL reported an issue</h1>
    <p style='font-size:.85rem;'>" . htmlspecialchars($conn->error) . "</p>
    <p>This usually just means the database already existed. Try opening the site — it may already work.</p>
    <a class='btn' href='index.html'>Open Help Center</a>
  ", false);
  exit;
}

// Step 4: verify it actually worked by counting rows
$conn->select_db(DB_NAME);
$check = $conn->query("SELECT COUNT(*) AS c FROM faqs");
$count = $check ? $check->fetch_assoc()['c'] : 0;

render_page('Setup complete', "
  <h1>✅ Database is ready!</h1>
  <p>Created database <code>beacon_helpcenter</code> with all tables, and loaded <b>$count FAQs</b> plus 8 categories.</p>
  <p>You can delete or ignore this file now — you won't need to run it again unless you want to reset the database back to the original seed data.</p>
  <a class='btn' href='index.html'>Open Help Center</a>
  <a class='btn outline' href='login.html'>Go to Admin Login</a>
");
