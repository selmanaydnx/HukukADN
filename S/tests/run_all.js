const { spawnSync } = require('node:child_process');
const path = require('node:path');

console.log('====================================================');
console.log('  ADN PLATFORMU - TÜM TEST SÜİTLERİ BAŞLATILIYOR   ');
console.log('====================================================\n');

const testFiles = [
  'procedural.test.js',
  'auth.test.js',
  'tenant_isolation.test.js',
  'ai_guardrail.test.js',
  'e2e_full_flow.js',
  'charts_and_notifications.test.js',
  'lawyer_intern_tools.test.js',
  'system_admin.test.js',
  'subscription_system.test.js',
  'auth_lifecycle.test.js'
];

let failed = false;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n▶ KOŞULUYOR: ${file}`);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env }
  });

  if (result.status !== 0) {
    console.error(`❌ HATA: ${file} BAŞARISIZ OLDU (Çıkış Kodu: ${result.status})`);
    failed = true;
    break;
  }
}

console.log('\n====================================================');
if (failed) {
  console.error('❌ BAZI TESTLER BAŞARISIZ OLDU!');
  process.exit(1);
} else {
  console.log(`🎉 TEBRİKLER! TÜM TEST SÜİTLERİ (${testFiles.length}/${testFiles.length}) BAŞARIYLA TAMAMLANDI!`);
  console.log('====================================================\n');
  process.exit(0);
}
