<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| Web Routes - ADN Avukat ve Büro Yönetim Platformu
|--------------------------------------------------------------------------
*/

// Ana Sayfa: Oturum varsa /panel, yoksa landing.blade.php
Route::get('/', function (Request $request) {
    if (session()->has('user_id')) {
        return redirect('/panel');
    }
    return view('landing');
});

// Bağımsız Sayfalar
Route::get('/giris', function () {
    return view('giris');
});

Route::get('/kayit', function () {
    return view('kayit');
});

Route::get('/sifremi-unuttum', function () {
    return view('sifremi-unuttum');
});

Route::get('/paketler', function () {
    return view('paketler');
});

Route::get('/system', function () {
    return view('system');
});

// Korunan Büro Yönetim Paneli
Route::middleware(['tenant.auth'])->group(function () {
    Route::get('/panel', function () {
        return view('panel');
    });
});
