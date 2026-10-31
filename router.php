<?php
// Dev router (workspace, no Apache): php -S localhost:8148 router.php
// Static files served as-is; everything else hits the front controller.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;
if ($path !== '/' && is_file($file)) {
    return false; // serve the static asset
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
