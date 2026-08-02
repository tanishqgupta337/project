<?php
/* ==========================================================================
   config.php — shared MySQL connection for all api/*.php endpoints
   Edit DB_USER / DB_PASS below to match your local MySQL (XAMPP/WAMP)
   credentials. Default XAMPP setup is usually user "root" with a blank
   password, which is what's set here.
   ========================================================================== */

define('DB_HOST', 'localhost');
define('DB_NAME', 'beacon_helpcenter');
define('DB_USER', 'root');
define('DB_PASS', '');

// Every API response is JSON.
header('Content-Type: application/json; charset=utf-8');

// Allow the front-end pages (served from the same project) to call these
// endpoints with fetch(). Same-origin requests don't need this, but it's
// kept permissive here since this is a local college-project setup.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'error' => "Database not ready. Open setup.php in your browser once (e.g. http://localhost/DynamicFAQHelpCenter/setup.php) to create it automatically, then reload this page.",
    'details' => $conn->connect_error
  ]);
  exit;
}

$conn->set_charset('utf8mb4');

/* Small helper so every endpoint can bail out consistently. */
function send_json($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

/* Reads JSON body for POST/PUT requests (fetch sends JSON, not form-data). */
function read_json_body() {
  $raw = file_get_contents('php://input');
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : [];
}
