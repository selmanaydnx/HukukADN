<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $userRole = $request->attributes->get('role') ?? $request->user_role ?? 'viewer';

        if (!in_array($userRole, $roles)) {
            return response()->json([
                'error' => 'Bu işlem için yetkiniz bulunmamaktadır. Gereken rol: ' . implode(', ', $roles)
            ], 403);
        }

        return $next($request);
    }
}
