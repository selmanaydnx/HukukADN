const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const { requireAuth, requireRole } = require('./src/middleware/auth');
const { rateLimitAuth } = require('./src/middleware/rate-limiter');

const authController = require('./src/controllers/authController');
const clientsController = require('./src/controllers/clientsController');
const casesController = require('./src/controllers/casesController');
const eventsController = require('./src/controllers/eventsController');
const tasksController = require('./src/controllers/tasksController');
const documentsController = require('./src/controllers/documentsController');
const financeController = require('./src/controllers/financeController');
const aiController = require('./src/controllers/aiController');
const tenantController = require('./src/controllers/tenantController');
const legalCalcController = require('./src/controllers/legalCalcController');
const systemController = require('./src/controllers/systemController');
const subscriptionController = require('./src/controllers/subscriptionController');
const { requireSystemAuth } = require('./src/middleware/systemAuth');
const { requireBillingAuth, checkSubscriptionLimits } = require('./src/middleware/subscriptionMiddleware');
const { calculateProceduralDeadline, calculateUetsLegalServiceDate } = require('./src/utils/proceduralRules');
const { getDb } = require('./src/database/db');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Response Helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Request Body Parser Helper
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add standard helper methods
  res.json = (data) => sendJson(res, res.statusCode || 200, data);
  res.status = (code) => { res.statusCode = code; return res; };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  // API Router
  if (pathname.startsWith('/api/')) {
    req.body = await parseBody(req);

    try {
      // ==========================================
      // SİSTEM YÖNETİCİSİ (SÜPER ADMİN) ROTLARI (/api/system/*)
      // ==========================================
      if (pathname.startsWith('/api/system/')) {
        // Sistem Açık Rotaları
        if (pathname === '/api/system/auth/login' && req.method === 'POST') {
          return rateLimitAuth(req, res, () => systemController.login(req, res));
        }
        if (pathname === '/api/system/auth/logout' && req.method === 'POST') {
          return systemController.logout(req, res);
        }
        if (pathname === '/api/system/announcements' && req.method === 'GET') {
          return systemController.getAnnouncements(req, res);
        }
        if (pathname === '/api/system/plans' && req.method === 'GET') {
          return systemController.listPlans(req, res);
        }

        // Sistem Korumalı Rotaları (Yalnızca ömer:2571)
        return requireSystemAuth(req, res, () => {
          if (pathname === '/api/system/auth/me' && req.method === 'GET') {
            return systemController.getMe(req, res);
          }
          if (pathname === '/api/system/stats' && req.method === 'GET') {
            return systemController.getDashboardStats(req, res);
          }
          if (pathname === '/api/system/tenants' && req.method === 'GET') {
            return systemController.listTenants(req, res);
          }
          if (pathname.startsWith('/api/system/tenants/') && req.method === 'PATCH') {
            req.params = { id: pathname.replace('/api/system/tenants/', '') };
            return systemController.updateTenant(req, res);
          }
          if (pathname.startsWith('/api/system/tenants/') && req.method === 'DELETE') {
            req.params = { id: pathname.replace('/api/system/tenants/', '') };
            return systemController.deleteTenant(req, res);
          }
          if (pathname === '/api/system/users' && req.method === 'GET') {
            return systemController.listUsers(req, res);
          }
          if (pathname.match(/^\/api\/system\/users\/[^/]+\/reset-password$/) && req.method === 'POST') {
            const parts = pathname.split('/');
            req.params = { id: parts[4] };
            return systemController.resetUserPassword(req, res);
          }
          if (pathname.startsWith('/api/system/plans/') && req.method === 'PUT') {
            req.params = { id: pathname.replace('/api/system/plans/', '') };
            return systemController.updatePlan(req, res);
          }
          if (pathname === '/api/system/plans' && req.method === 'POST') {
            return systemController.createPlan(req, res);
          }
          if (pathname === '/api/system/audit-logs' && req.method === 'GET') {
            return systemController.listAuditLogs(req, res);
          }
          if (pathname === '/api/system/announcements' && req.method === 'POST') {
            return systemController.saveAnnouncement(req, res);
          }

          return res.status(404).json({ error: 'Sistem API uç noktası bulunamadı.' });
        });
      }

      // 1. PUBLIC AUTH ROUTES
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        return authController.register(req, res);
      }
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        return rateLimitAuth(req, res, () => authController.login(req, res));
      }
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        return authController.logout(req, res);
      }
      if (pathname === '/api/auth/verify-email' && req.method === 'POST') {
        return authController.verifyEmail(req, res);
      }
      if (pathname === '/api/auth/resend-verification' && req.method === 'POST') {
        return authController.resendVerification(req, res);
      }
      if (pathname === '/api/auth/forgot-password' && req.method === 'POST') {
        return authController.forgotPassword(req, res);
      }
      if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
        return authController.resetPassword(req, res);
      }

      // Public procedural & calculation APIs (accessible to all lawyers & interns)
      if (pathname === '/api/procedural/calculate' && req.method === 'POST') {
        const { baseDate, ruleType, customDays } = req.body;
        const result = calculateProceduralDeadline(baseDate, ruleType, customDays);
        return res.json(result);
      }
      if (pathname === '/api/calc/deadline' && req.method === 'POST') {
        return legalCalcController.calculateDeadlineApi(req, res);
      }
      if (pathname === '/api/calc/smm' && req.method === 'POST') {
        return legalCalcController.calculateSmmApi(req, res);
      }
      if (pathname === '/api/calc/execution' && req.method === 'POST') {
        return legalCalcController.calculateExecutionCoverApi(req, res);
      }
      if (pathname === '/api/calc/aaut' && req.method === 'POST') {
        return legalCalcController.calculateAautApi(req, res);
      }

      // Public Billing & Webhook APIs
      if (pathname === '/api/billing/plans' && req.method === 'GET') {
        return subscriptionController.listPlans(req, res);
      }
      if (pathname === '/api/billing/webhook/iyzico' && req.method === 'POST') {
        return subscriptionController.handleIyzicoWebhook(req, res);
      }
      if (pathname === '/api/billing/webhook/paytr' && req.method === 'POST') {
        return subscriptionController.handleIyzicoWebhook(req, res);
      }

      // 2. PROTECTED ROUTES (Require valid session & tenant)
      return requireAuth(req, res, () => {
        
        // Profile & Tenant Switch
        if (pathname === '/api/auth/profile' && req.method === 'GET') {
          return authController.getProfile(req, res);
        }
        if (pathname === '/api/auth/profile' && req.method === 'PUT') {
          return authController.updateProfile(req, res);
        }
        if (pathname === '/api/auth/change-password' && req.method === 'POST') {
          return authController.changePassword(req, res);
        }
        if (pathname === '/api/auth/switch-tenant' && req.method === 'POST') {
          return authController.switchTenant(req, res);
        }

        // ==========================================
        // ABONELİK VE FATURALANDIRMA ROTLARI
        // ==========================================
        if (pathname === '/api/billing/my-subscription' && req.method === 'GET') {
          return subscriptionController.getMySubscription(req, res);
        }
        if (pathname === '/api/billing/start-trial' && req.method === 'POST') {
          return requireBillingAuth(req, res, () => subscriptionController.startTrial(req, res));
        }
        if (pathname === '/api/billing/checkout' && req.method === 'POST') {
          return requireBillingAuth(req, res, () => subscriptionController.checkout(req, res));
        }
        if (pathname === '/api/billing/cancel' && req.method === 'POST') {
          return requireBillingAuth(req, res, () => subscriptionController.cancelSubscription(req, res));
        }
        if (pathname === '/api/billing/change-plan' && req.method === 'POST') {
          return requireBillingAuth(req, res, () => subscriptionController.changePlan(req, res));
        }
        if (pathname === '/api/billing/transactions' && req.method === 'GET') {
          return subscriptionController.listTransactions(req, res);
        }

        // Dashboard Summary API (Real counts and rich analytics from tenant DB)
        if (pathname === '/api/dashboard/summary' && req.method === 'GET') {
          const db = getDb();
          const today = new Date().toISOString().split('T')[0];

          const stats = db.prepare(`
            SELECT
              (SELECT COUNT(*) FROM cases WHERE tenant_id = ? AND status = 'active') AS active_cases,
              (SELECT COUNT(*) FROM events WHERE tenant_id = ? AND event_type = 'hearing' AND date(event_date) = ?) AS today_hearings,
              (SELECT COUNT(*) FROM tasks WHERE tenant_id = ? AND status = 'pending') AS pending_tasks,
              (SELECT COALESCE(SUM(amount), 0) FROM financial_records WHERE tenant_id = ? AND record_type = 'collection') AS total_collections
          `).get(req.tenantId, req.tenantId, today, req.tenantId, req.tenantId);

          const upcomingHearings = db.prepare(`
            SELECT e.*, c.internal_no, c.court_name, cl.name AS client_name
            FROM events e
            LEFT JOIN cases c ON e.case_id = c.id
            LEFT JOIN clients cl ON c.client_id = cl.id
            WHERE e.tenant_id = ? AND e.event_date >= ?
            ORDER BY e.event_date ASC LIMIT 5
          `).all(req.tenantId, today);

          const urgentDeadlines = db.prepare(`
            SELECT e.*, c.internal_no, cl.name AS client_name
            FROM events e
            LEFT JOIN cases c ON e.case_id = c.id
            LEFT JOIN clients cl ON c.client_id = cl.id
            WHERE e.tenant_id = ? AND e.event_type = 'deadline' AND e.event_date >= ?
            ORDER BY e.event_date ASC LIMIT 5
          `).all(req.tenantId, today);

          // Portföy / Dava Türü Dağılımı (Donut chart için)
          const caseTypeDistribution = db.prepare(`
            SELECT case_type, COUNT(*) as count
            FROM cases
            WHERE tenant_id = ? AND status = 'active'
            GROUP BY case_type
          `).all(req.tenantId);

          // Yargılama Aşamaları Dağılımı (Funnel / Boru hattı için)
          const stageDistribution = db.prepare(`
            SELECT stage, COUNT(*) as count
            FROM cases
            WHERE tenant_id = ? AND status = 'active'
            GROUP BY stage
          `).all(req.tenantId);

          // Aylık Finansal Trend (Bar chart için)
          const monthlyFinancials = db.prepare(`
            SELECT strftime('%Y-%m', payment_date) as month, record_type, SUM(amount) as total
            FROM financial_records
            WHERE tenant_id = ?
            GROUP BY strftime('%Y-%m', payment_date), record_type
            ORDER BY month ASC LIMIT 6
          `).all(req.tenantId);

          // Dinamik Bildirimler (Notification Drawer için)
          const notifications = [];

          // 1. Yaklaşan Celse Bildirimleri
          upcomingHearings.forEach(h => {
            const hDate = new Date(h.event_date);
            const isToday = h.event_date.startsWith(today);
            notifications.push({
              id: `notif-h-${h.id}`,
              type: 'hearing',
              category: 'duruşma',
              title: isToday ? '🔴 BUGÜN Duruşmanız Var!' : '📅 Yaklaşan Duruşma',
              message: `${h.internal_no || 'Dosya'}: ${h.title} (${h.court_name || 'Mahkeme'})`,
              date: h.event_date,
              urgent: isToday,
              timeLabel: isToday ? 'Bugün ' + hDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : hDate.toLocaleDateString('tr-TR')
            });
          });

          // 2. Kritik Süre & UETS Bildirimleri
          urgentDeadlines.forEach(d => {
            notifications.push({
              id: `notif-d-${d.id}`,
              type: 'deadline',
              category: 'sure',
              title: '⏱️ Kritik Yasal Süre / Tebligat',
              message: `${d.internal_no || 'Dosya'}: ${d.title} son gün yaklaşıyor.`,
              date: d.event_date,
              urgent: true,
              timeLabel: new Date(d.event_date).toLocaleDateString('tr-TR')
            });
          });

          // 3. Bekleyen Yüksek Öncelikli Görevler
          const urgentTasks = db.prepare(`
            SELECT t.*, c.internal_no
            FROM tasks t
            LEFT JOIN cases c ON t.case_id = c.id
            WHERE t.tenant_id = ? AND t.status = 'pending' AND t.priority = 'high'
            LIMIT 3
          `).all(req.tenantId);

          urgentTasks.forEach(t => {
            notifications.push({
              id: `notif-t-${t.id}`,
              type: 'task',
              category: 'gorev',
              title: '⚡ Yüksek Öncelikli Görev',
              message: `${t.internal_no ? t.internal_no + ': ' : ''}${t.title}`,
              date: t.created_at,
              urgent: false,
              timeLabel: t.due_date ? new Date(t.due_date).toLocaleDateString('tr-TR') : 'Bekliyor'
            });
          });

          return res.json({
            stats,
            upcomingHearings,
            urgentDeadlines,
            caseTypeDistribution,
            stageDistribution,
            monthlyFinancials,
            notifications
          });
        }

        // Clients CRM
        if (pathname === '/api/clients/conflict-check' && req.method === 'GET') {
          return clientsController.checkConflict(req, res);
        }
        if (pathname === '/api/clients' && req.method === 'GET') {
          return clientsController.listClients(req, res);
        }
        if (pathname === '/api/clients' && req.method === 'POST') {
          return clientsController.createClient(req, res);
        }
        if (pathname.startsWith('/api/clients/') && req.method === 'GET') {
          req.params = { id: pathname.replace('/api/clients/', '') };
          return clientsController.getClient(req, res);
        }
        if (pathname.startsWith('/api/clients/') && req.method === 'PUT') {
          req.params = { id: pathname.replace('/api/clients/', '') };
          return clientsController.updateClient(req, res);
        }
        if (pathname.startsWith('/api/clients/') && req.method === 'DELETE') {
          req.params = { id: pathname.replace('/api/clients/', '') };
          return clientsController.deleteClient(req, res);
        }

        // Cases (Limit denetimli dava açılışı)
        if (pathname === '/api/cases' && req.method === 'GET') {
          return casesController.listCases(req, res);
        }
        if (pathname === '/api/cases' && req.method === 'POST') {
          return checkSubscriptionLimits('cases')(req, res, () => casesController.createCase(req, res));
        }
        if (pathname.startsWith('/api/cases/') && pathname.endsWith('/hearing-notes') && req.method === 'POST') {
          req.params = { id: pathname.replace('/api/cases/', '').replace('/hearing-notes', '') };
          return casesController.recordHearingNotes(req, res);
        }
        if (pathname.startsWith('/api/cases/') && pathname.endsWith('/archive') && req.method === 'POST') {
          req.params = { id: pathname.replace('/api/cases/', '').replace('/archive', '') };
          return casesController.archiveCase(req, res);
        }
        if (pathname.startsWith('/api/cases/') && req.method === 'GET') {
          req.params = { id: pathname.replace('/api/cases/', '') };
          return casesController.getCase(req, res);
        }
        if (pathname.startsWith('/api/cases/') && req.method === 'PUT') {
          req.params = { id: pathname.replace('/api/cases/', '') };
          return casesController.updateCase(req, res);
        }

        // Events & Hearings
        if (pathname === '/api/events' && req.method === 'GET') {
          return eventsController.listEvents(req, res);
        }
        if (pathname === '/api/events' && req.method === 'POST') {
          return eventsController.createEvent(req, res);
        }
        if (pathname.startsWith('/api/events/') && req.method === 'PUT') {
          req.params = { id: pathname.replace('/api/events/', '') };
          return eventsController.updateEvent(req, res);
        }
        if (pathname.startsWith('/api/events/') && req.method === 'DELETE') {
          req.params = { id: pathname.replace('/api/events/', '') };
          return eventsController.deleteEvent(req, res);
        }

        // Tasks
        if (pathname === '/api/tasks' && req.method === 'GET') {
          return tasksController.listTasks(req, res);
        }
        if (pathname === '/api/tasks' && req.method === 'POST') {
          return tasksController.createTask(req, res);
        }
        if (pathname.startsWith('/api/tasks/') && pathname.endsWith('/toggle') && req.method === 'POST') {
          req.params = { id: pathname.replace('/api/tasks/', '').replace('/toggle', '') };
          return tasksController.toggleTask(req, res);
        }
        if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
          req.params = { id: pathname.replace('/api/tasks/', '') };
          return tasksController.deleteTask(req, res);
        }

        // Documents (Limit denetimli evrak yükleme)
        if (pathname === '/api/documents' && req.method === 'GET') {
          return documentsController.listDocuments(req, res);
        }
        if (pathname === '/api/documents/upload' && req.method === 'POST') {
          return checkSubscriptionLimits('storage')(req, res, () => documentsController.uploadDocument(req, res));
        }
        if (pathname.startsWith('/api/documents/') && pathname.endsWith('/download') && req.method === 'GET') {
          req.params = { id: pathname.replace('/api/documents/', '').replace('/download', '') };
          return documentsController.downloadDocument(req, res);
        }
        if (pathname.startsWith('/api/documents/') && req.method === 'DELETE') {
          req.params = { id: pathname.replace('/api/documents/', '') };
          return documentsController.deleteDocument(req, res);
        }

        // Finance
        if (pathname === '/api/finance' && req.method === 'GET') {
          return financeController.listFinancialRecords(req, res);
        }
        if (pathname === '/api/finance' && req.method === 'POST') {
          return financeController.createFinancialRecord(req, res);
        }
        if (pathname.startsWith('/api/finance/') && req.method === 'DELETE') {
          req.params = { id: pathname.replace('/api/finance/', '') };
          return financeController.deleteFinancialRecord(req, res);
        }

        // AI Processing (Limit denetimli TBB AI analizleri)
        if (pathname === '/api/ai/process' && req.method === 'POST') {
          return checkSubscriptionLimits('ai')(req, res, () => aiController.processAIRequest(req, res));
        }

        // Tenant Settings (Limit denetimli üye davet etme)
        if (pathname === '/api/tenant/settings' && req.method === 'GET') {
          return tenantController.getTenantSettings(req, res);
        }
        if (pathname === '/api/tenant/settings' && req.method === 'PUT') {
          return requireRole(['owner', 'manager'])(req, res, () => tenantController.updateTenantSettings(req, res));
        }
        if (pathname === '/api/tenant/invite' && req.method === 'POST') {
          return requireRole(['owner', 'manager'])(req, res, () => {
            return checkSubscriptionLimits('members')(req, res, () => tenantController.inviteMember(req, res));
          });
        }
        if (pathname.startsWith('/api/tenant/members/') && req.method === 'DELETE') {
          req.params = { userId: pathname.replace('/api/tenant/members/', '') };
          return requireRole(['owner'])(req, res, () => tenantController.removeMember(req, res));
        }
        if (pathname === '/api/tenant/audit-logs' && req.method === 'GET') {
          return requireRole(['owner', 'manager'])(req, res, () => tenantController.listAuditLogs(req, res));
        }
        if (pathname === '/api/tenant/export' && req.method === 'GET') {
          return requireRole(['owner'])(req, res, () => tenantController.exportTenantData(req, res));
        }

        return res.status(404).json({ error: 'API uç noktası bulunamadı.' });
      });

    } catch (err) {
      console.error('API Error:', err);
      return res.status(500).json({ error: 'Sunucu tarafında bir hata oluştu.' });
    }
  }

// Session Validator Helper for Protected Pages
function getValidSession(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v.join('='));
  });
  const sessionId = cookies['adn_session'];
  if (!sessionId) return null;
  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.full_name, u.email, t.name as tenant_name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN tenants t ON s.tenant_id = t.id
      WHERE s.id = ? AND s.expires_at > datetime('now');
    `).get(sessionId);
    return session || null;
  } catch (e) {
    return null;
  }
}

  // STATIC FILE SERVER & PAGE ROUTING
  const validSession = getValidSession(req);
  let filePath;

  // 1. Ziyaretçi Ana Sayfası (/)
  if (pathname === '/' || pathname === '') {
    if (validSession) {
      res.writeHead(302, { Location: '/panel' });
      return res.end();
    }
    filePath = path.join(PUBLIC_DIR, 'landing.html');
  } 
  // 2. Büro Yönetim Paneli (/panel veya /app) - SUNUCU KORUMALI
  else if (pathname === '/panel' || pathname === '/panel/' || pathname === '/app' || pathname === '/app/') {
    if (!validSession) {
      res.writeHead(302, { Location: '/giris' });
      return res.end();
    }
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  // 3. Giriş Sayfası (/giris)
  else if (pathname === '/giris' || pathname === '/giris/') {
    if (validSession) {
      res.writeHead(302, { Location: '/panel' });
      return res.end();
    }
    filePath = path.join(PUBLIC_DIR, 'giris.html');
  }
  // 4. Kayıt Sayfası (/kayit)
  else if (pathname === '/kayit' || pathname === '/kayit/') {
    if (validSession) {
      res.writeHead(302, { Location: '/panel' });
      return res.end();
    }
    filePath = path.join(PUBLIC_DIR, 'kayit.html');
  }
  // 5. Şifremi Unuttum Sayfası (/sifremi-unuttum)
  else if (pathname === '/sifremi-unuttum' || pathname === '/sifremi-unuttum/') {
    filePath = path.join(PUBLIC_DIR, 'sifremi-unuttum.html');
  }
  // 6. Paketler Sayfası (/paketler)
  else if (pathname === '/paketler' || pathname === '/paketler/') {
    filePath = path.join(PUBLIC_DIR, 'paketler.html');
  }
  // 7. Sistem Süper Yönetici Paneli (/system)
  else if (pathname === '/system' || pathname === '/system/') {
    filePath = path.join(PUBLIC_DIR, 'system.html');
  }
  // 8. Statik Dosyalar (CSS, JS, Resimler vb.)
  else {
    filePath = path.join(PUBLIC_DIR, pathname);
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA Fallback: If not an asset and html requested
        if (!ext || ext === '.html') {
          // If trying to access protected root without file, show landing
          const fallback = validSession ? 'index.html' : 'landing.html';
          fs.readFile(path.join(PUBLIC_DIR, fallback), (err2, fallbackContent) => {
            if (err2) {
              // If landing.html doesn't exist yet, fallback to index.html
              fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err3, idxContent) => {
                if (err3) {
                  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                  return res.end('404 Not Found');
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                return res.end(idxContent);
              });
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(fallbackContent);
          });
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Server Error: ' + err.code);
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`ADN Platform running at http://localhost:${PORT}/`);
});

module.exports = server;
