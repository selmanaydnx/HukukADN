<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant.auth' => \App\Http\Middleware\EnsureTenantContext::class,
            'role' => \App\Http\Middleware\CheckRole::class,
            'system.auth' => \App\Http\Middleware\CheckSystemAuth::class,
            'subscription.limit' => \App\Http\Middleware\CheckSubscriptionLimits::class,
            'rate.limit.auth' => \App\Http\Middleware\RateLimitAuth::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/*',
            'api/billing/webhook',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Custom API Exception Handling
    })->create();
