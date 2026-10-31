<?php
declare(strict_types=1);

/**
 * Infog config loader + error handling (stack standard).
 * No database is used by this MVP — all content is static JSON/Markdown
 * under data/. The config file still follows the house shape; db creds
 * are simply unused for now.
 */
function infog_config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $path = __DIR__ . '/config.php';
        if (!is_file($path)) {
            http_response_code(500);
            exit("Setup: copy lib/config.example.php to lib/config.php and fill it in.");
        }
        $cfg = require $path;
    }
    return $cfg;
}

function infog_debug(): bool
{
    $cfg = infog_config();
    return (bool)($cfg['debug'] ?? false);
}

function infog_fail(Throwable $e): void
{
    http_response_code(500);
    if (infog_debug()) {
        echo "<pre>" . htmlspecialchars($e->getMessage() . "\n" . $e->getTraceAsString()) . "</pre>";
    } else {
        echo "<h1>Something went wrong</h1><p>This infographic hit an error. Please try again.</p>";
    }
    exit;
}

set_error_handler(function (int $no, string $str, string $file, int $line) {
    throw new ErrorException($str, 0, $no, $file, $line);
});
set_exception_handler('infog_fail');

error_reporting(infog_debug() ? E_ALL : 0);
ini_set('display_errors', infog_debug() ? '1' : '0');
