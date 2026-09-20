<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Abonelik Paketleri (Solo, Pro, Enterprise)
        $plans = [
            [
                'id' => 'solo',
                'name' => 'Bireysel (Solo)',
                'price_monthly' => 490.00,
                'price_yearly' => 4700.00,
                'currency' => 'TRY',
                'max_lawyers' => 1,
                'max_cases' => 150,
                'storage_gb' => 15,
                'ai_queries_monthly' => 150,
                'features_json' => json_encode([
                    '1 Avukat Hesabı',
                    '150 Aktif Dava Dosyası',
                    '15 GB Şifreli Bulut Alanı',
                    'Aylık 150 TBB & Mevzuat AI Sorgusu',
                    'HMK, UETS ve Süre Takip Motoru',
                    'SMM ve İcra Kapak Hesaplayıcı',
                    'Temel E-Posta Desteği'
                ], JSON_UNESCAPED_UNICODE),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'pro',
                'name' => 'Büro (Pro)',
                'price_monthly' => 1290.00,
                'price_yearly' => 12380.00,
                'currency' => 'TRY',
                'max_lawyers' => 5,
                'max_cases' => 750,
                'storage_gb' => 75,
                'ai_queries_monthly' => 750,
                'features_json' => json_encode([
                    '5 Avukat & Personel Hesabı',
                    '750 Aktif Dava Dosyası',
                    '75 GB Şifreli Bulut Depolama',
                    'Aylık 750 TBB & Mevzuat AI Sorgusu',
                    'Duruşma Zabıt ve Kesin Mehil Takibi',
                    'Menfaat Çatışması (Conflict Check) Filtresi',
                    'Kasa, Harç & Masraf Pusulası',
                    'Öncelikli Telefon & Canlı Destek'
                ], JSON_UNESCAPED_UNICODE),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'enterprise',
                'name' => 'Kurumsal (Enterprise)',
                'price_monthly' => 2990.00,
                'price_yearly' => 28700.00,
                'currency' => 'TRY',
                'max_lawyers' => 25,
                'max_cases' => -1, // Sınırsız
                'storage_gb' => 300,
                'ai_queries_monthly' => 3000,
                'features_json' => json_encode([
                    '25+ Avukat & Yetkilendirilmiş Ekip',
                    'Sınırsız Aktif Dava & İcra Dosyası',
                    '300 GB Şifreli Bulut & Belge Arşivi',
                    'Aylık 3.000 Gelişmiş AI Sorgusu & Analiz',
                    'Çok Bürolu Departman & Şube Yönetimi',
                    'Özel API, Webhook & UYAP Veri Aktarımı',
                    'Özel Müşteri Temsilcisi & SLA Garantisi'
                ], JSON_UNESCAPED_UNICODE),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('subscription_plans')->updateOrInsert(
                ['id' => $plan['id']],
                $plan
            );
        }

        // 2. Sistem Yöneticisi (/system - ömer:2571)
        // Parola: 2571
        $existingAdmin = DB::table('system_admins')->where('username', 'ömer')->first();
        if (!$existingAdmin) {
            DB::table('system_admins')->insert([
                'id' => 'adm_omer_super',
                'username' => 'ömer',
                'password_hash' => password_hash('2571', PASSWORD_BCRYPT),
                'full_name' => 'Ömer Sistem Yöneticisi',
                'role' => 'superadmin',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Sistem Duyurusu
        $announcementCount = DB::table('system_announcements')->count();
        if ($announcementCount === 0) {
            DB::table('system_announcements')->insert([
                'id' => 'anc_welcome_2026',
                'title' => 'ADN Hukuk Platformu Laravel 12 & MySQL Sürümüne Geçti',
                'content' => 'Sistem altyapımız yüksek performanslı Laravel 12 ve kurumsal MySQL veritabanına taşınmıştır. Tüm HMK süre hesaplayıcıları, UETS kontrolleri ve büro izolasyon mekanizmaları aktiftir.',
                'priority' => 'info',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
