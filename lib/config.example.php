<?php
declare(strict_types=1);

return [
    // --- database (required) ---
    'db' => [
        'host'    => 'localhost',   // Hostinger preset; rarely changes
        'port'    => 3306,
        'name'    => 'u123456789_infog',
        'user'    => 'u123456789_infoguser',
        'pass'    => 'CHANGE_ME',
    ],

    // --- app (optional, one line) ---
    'app_url' => 'https://infog.earth-turtle.com',

    // --- debug (always present) ---
    'debug' => false,
];
