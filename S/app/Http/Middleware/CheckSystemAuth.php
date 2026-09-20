<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\SystemAdmin;

class CheckSystemAuth
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $systemAdminId = session('system_admin_id');

        if (!$systemAdminId) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => 'Sistem yöneticisi yetkisi gereklidir.'], 401);
            }
            return redirect('/system');
        }

        $admin = SystemAdmin::find($systemAdminId);
        if (!$admin) {
            session()->forget('system_admin_id');
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['error' => 'Geçersiz sistem yöneticisi oturumu.'], 401);
            }
            return redirect('/system');
        }

        $request->attributes->set('system_admin', $admin);
        return $next($request);
    }
}
