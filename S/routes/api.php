<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\LegalCalcController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SystemController;
use App\Http\Controllers\AiController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\TenantController;

/*
|--------------------------------------------------------------------------
| API Routes - ADN Platformu (RESTful)
|--------------------------------------------------------------------------
*/

// ==========================================
// 1. AÇIK GÜVENLİK VE KİMLİK DOĞRULAMA ROTLARI
// ==========================================
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('rate.limit.auth');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// ==========================================
// 2. AÇIK HESAPLAYICILAR VE USUL KURALLARI
// ==========================================
Route::prefix('calc')->group(function () {
    Route::post('/procedural', [LegalCalcController::class, 'procedural']);
    Route::post('/smm', [LegalCalcController::class, 'smm']);
    Route::post('/execution', [LegalCalcController::class, 'execution']);
    Route::post('/aaut', [LegalCalcController::class, 'aaut']);
});

// ==========================================
// 3. ABONELİK VE ÖDEME AÇIK UÇLARI
// ==========================================
Route::prefix('billing')->group(function () {
    Route::get('/plans', [SubscriptionController::class, 'plans']);
    Route::post('/webhook', [SubscriptionController::class, 'webhook']);
});

// ==========================================
// 4. SİSTEM YÖNETİCİSİ (/system) ROTLARI
// ==========================================
Route::prefix('system')->group(function () {
    Route::post('/auth/login', [SystemController::class, 'login'])->middleware('rate.limit.auth');
    Route::post('/auth/logout', [SystemController::class, 'logout']);
    Route::get('/announcements', [SystemController::class, 'announcements']);

    Route::middleware(['system.auth'])->group(function () {
        Route::get('/dashboard', [SystemController::class, 'dashboard']);
        Route::get('/tenants', [SystemController::class, 'tenants']);
        Route::post('/tenants/{id}/suspend', [SystemController::class, 'suspendTenant']);
        Route::post('/tenants/{id}/activate', [SystemController::class, 'activateTenant']);
        Route::post('/tenants/{id}/reset-password', [SystemController::class, 'resetOfficePassword']);
        Route::put('/plans/{id}', [SystemController::class, 'updatePlan']);
    });
});

// ==========================================
// 5. KORUNAN BÜRO API ROTLARI (Multi-Tenant)
// ==========================================
Route::middleware(['tenant.auth'])->group(function () {
    // Profil
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Abonelik Yönetimi & Kotalar
    Route::prefix('billing')->group(function () {
        Route::get('/my-subscription', [SubscriptionController::class, 'mySubscription']);
        Route::post('/start-trial', [SubscriptionController::class, 'startTrial']);
        Route::post('/checkout', [SubscriptionController::class, 'checkout']);
        Route::post('/cancel', [SubscriptionController::class, 'cancel']);
        Route::get('/invoices', [SubscriptionController::class, 'invoices']);
    });

    // Müvekkiller
    Route::apiResource('clients', ClientController::class);

    // Dava Dosyaları (Kota Korumalı: subscription.limit:cases)
    Route::get('/cases', [CaseController::class, 'index']);
    Route::post('/cases', [CaseController::class, 'store'])->middleware('subscription.limit:cases');
    Route::get('/cases/{id}', [CaseController::class, 'show']);
    Route::put('/cases/{id}', [CaseController::class, 'update']);
    Route::delete('/cases/{id}', [CaseController::class, 'destroy']);

    // Takvim ve Duruşmalar
    Route::apiResource('events', EventController::class);

    // Görevler
    Route::apiResource('tasks', TaskController::class);

    // Belgeler (Kota Korumalı: subscription.limit:storage)
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store'])->middleware('subscription.limit:storage');
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);

    // Finans & Kasa
    Route::get('/finance', [FinanceController::class, 'index']);
    Route::post('/finance', [FinanceController::class, 'store']);
    Route::get('/finance/stats', [FinanceController::class, 'stats']);
    Route::delete('/finance/{id}', [FinanceController::class, 'destroy']);

    // Büro ve Ekip Yönetimi (Kota Korumalı: subscription.limit:members)
    Route::get('/tenant/members', [TenantController::class, 'members']);
    Route::post('/tenant/invite', [TenantController::class, 'invite'])->middleware('subscription.limit:members');
    Route::put('/tenant/members/{id}/role', [TenantController::class, 'updateRole']);
    Route::delete('/tenant/members/{id}', [TenantController::class, 'removeMember']);

    // TBB AI Hukuk Asistanı (Kota Korumalı: subscription.limit:ai)
    Route::post('/ai/query', [AiController::class, 'query'])->middleware('subscription.limit:ai');
});
