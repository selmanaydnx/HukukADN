// Basit ve Güvenli In-Memory Rate Limiter

const attemptsMap = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 dakika
const MAX_ATTEMPTS = 5;

function rateLimitAuth(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const key = `auth_${ip}`;
  const now = Date.now();

  const record = attemptsMap.get(key) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + WINDOW_MS;
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingMinutes = Math.ceil((record.resetAt - now) / 60000);
    return res.status(429).json({
      error: `Çok fazla başarısız deneme yapıldı. Lütfen ${remainingMinutes} dakika sonra tekrar deneyiniz.`
    });
  }

  // Record increment function on failure
  req.recordFailedAuth = () => {
    record.count += 1;
    attemptsMap.set(key, record);
  };

  req.resetAuthAttempts = () => {
    attemptsMap.delete(key);
  };

  next();
}

module.exports = {
  rateLimitAuth
};
