<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\RateLimiter;

class RateLimitAuth
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $key = 'auth_attempt:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 10)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'error' => "Çok fazla hatalı giriş denemesi. Lütfen {$seconds} saniye sonra tekrar deneyin."
            ], 429);
        }

        RateLimiter::hit($key, 60);

        return $next($request);
    }
}
