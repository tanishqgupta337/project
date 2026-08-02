<?php
/* migrate_add_status.php — run once if you already had the database
   before this update. Adds the "status" column to contact_messages
   without deleting existing messages. Safe to run multiple times. */
require_once __DIR__ . '/config.php';

$check = $conn->query("SHOW COLUMNS FROM contact_messages LIKE 'status'");
if ($check->num_rows === 0) {
  $conn->query("ALTER TABLE contact_messages ADD COLUMN status ENUM('new','read','replied') NOT NULL DEFAULT 'new' AFTER message");
  send_json(['success' => true, 'message' => 'status column added.']);
} else {
  send_json(['success' => true, 'message' => 'status column already exists — nothing to do.']);
}
