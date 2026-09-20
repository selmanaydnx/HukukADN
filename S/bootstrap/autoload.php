<?php

/**
 * ADN Hukuk Platformu - Standalone PSR-4 Autoloader
 * Composer vendor bağımlılığı olmadan veya öncesinde App sınıflarını yüklemek için kullanılır.
 */

spl_autoload_register(function ($class) {
    // App\ -> app/
    $prefix = 'App\\';
    $baseDir = dirname(__DIR__) . '/app/';
    $len = strlen($prefix);

    if (strncmp($prefix, $class, $len) === 0) {
        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }

    // Database\ -> database/
    $dbPrefix = 'Database\\';
    $dbBaseDir = dirname(__DIR__) . '/database/';
    $dbLen = strlen($dbPrefix);

    if (strncmp($dbPrefix, $class, $dbLen) === 0) {
        $relativeClass = substr($class, $dbLen);
        $file = $dbBaseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});
