# 🚀 Production Deployment Guide

## Memory Management & Cleanup

### ✅ Automatic Cleanup (Already Implemented)

Your app has **aggressive memory cleanup** to prevent leaks:

| Scenario | Cleanup Time | Reason |
|----------|--------------|--------|
| **Finished Game** | 3 minutes | After `gameEnd` phase |
| **Abandoned Lobby** | 15 minutes | Never started |
| **All Disconnected** | 2 minutes | Everyone left |
| **Max Age** | 1 hour | Failsafe for any room |

**Cleanup runs every 10 minutes automatically.**

### 📊 Expected Memory Usage

- **Idle server:** ~40MB
- **1 active game (6 players):** ~5-8MB per game
- **10 concurrent games:** ~80-100MB total
- **After 100+ games:** Still ~80-100MB (old games cleaned up)

**No memory accumulation over time!** ✅

---

## 📝 Logging Strategy

### Development (Current Setup)
```bash
# All logs shown
npm run dev
```

### Production - Reduce Log Noise
```bash
# ZERO logs (no storage cost at all!)
LOG_LEVEL=none npm start

# Only show errors (minimal cost)
LOG_LEVEL=error npm start

# Show info + errors (development)
LOG_LEVEL=info npm start

# Debug everything (not recommended in prod)
LOG_LEVEL=debug npm start
```

### Log Levels Explained

| Level | What Gets Logged | Storage Cost | Use Case |
|-------|------------------|--------------|----------|
| `none` | **Nothing at all** | **$0** ✅✅ | Production (zero cost) |
| `error` | Errors only | **$0** ✅ | Production (safe) |
| `info` | Room events, cleanup, memory | ~$1-2/mo | Development |
| `debug` | Everything (verbose) | ~$5-10/mo | Debugging only |

**Recommendation:** Use `LOG_LEVEL=none` in production for ZERO log storage costs!

---

## ☁️ Cloud Deployment & Log Costs

### Popular Free-Tier Options

#### 1. **Railway** (Recommended)
- **Free tier:** 500 hours/month + $5 credit
- **Memory limit:** 512MB (more than enough)
- **Logs:** Free for 7 days, auto-deleted
- **Setup:**
  ```bash
  npm install -g @railway/cli
  railway login
  railway init
  railway up
  ```
- **Environment variables:**
  ```
  LOG_LEVEL=error
  PORT=3001
  ```

#### 2. **Fly.io**
- **Free tier:** 3 VMs with 256MB RAM each
- **Logs:** Free, 30-day retention
- **Setup:**
  ```bash
  flyctl launch
  flyctl deploy
  ```

#### 3. **Render**
- **Free tier:** 750 hours/month
- **Memory limit:** 512MB
- **Logs:** Free, 7-day retention

#### 4. **Heroku** (Paid but Simple)
- **Cost:** ~$7/month for Eco plan
- **Logs:** Automatic log rotation
- **Setup:** One-click deployment

### Log Cost Analysis

| Service | Log Storage | Cost | Auto-Cleanup |
|---------|-------------|------|--------------|
| Railway | 7 days | FREE ✅ | Yes |
| Fly.io | 30 days | FREE ✅ | Yes |
| Render | 7 days | FREE ✅ | Yes |
| Heroku | Via add-ons | $0-$10/mo | Yes |

**All services auto-rotate logs, so no manual cleanup needed!**

### Log Rotation (If Self-Hosting)

If you're hosting on your own VPS:

```bash
# Install PM2 (process manager with log rotation)
npm install -g pm2

# Start with log rotation
pm2 start dist/server.js --name least-count \
  --log-date-format "YYYY-MM-DD HH:mm:ss" \
  --max-memory-restart 200M \
  --log /var/log/least-count.log \
  --error /var/log/least-count-error.log

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 3
pm2 set pm2-logrotate:compress true
```

This keeps logs under control automatically.

---

## 🎯 Production Checklist

### Before Deploying

- [ ] Set `LOG_LEVEL=error` environment variable
- [ ] Test game end cleanup (play a full game)
- [ ] Test abandon cleanup (create room, leave for 15 min)
- [ ] Monitor `/stats` endpoint for memory leaks
- [ ] Configure CORS for your domain

### After Deploying

- [ ] Monitor memory usage via `/stats` endpoint
- [ ] Check logs for cleanup messages
- [ ] Play 10+ games and verify memory stays stable
- [ ] Set up uptime monitoring (UptimeRobot, etc.)

---

## 🔍 Monitoring Your App

### Health Check
```bash
curl https://your-app.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Stats Endpoint
```bash
curl https://your-app.com/stats
# Returns: activeRooms, memory, uptime, etc.
```

### What to Monitor

| Metric | Expected | Action If High |
|--------|----------|----------------|
| `activeRooms` | < 20 | Check cleanup logs |
| `heapUsed` | < 150MB | Restart or investigate |
| `connectedClients` | < 100 | Scale horizontally |

---

## 🛠️ Example Deployment (Railway)

### 1. Create `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Add to `package.json` (server)
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
  }
}
```

### 3. Environment Variables
```
LOG_LEVEL=none        # ← ZERO log storage cost
NODE_ENV=production
```

### 4. Deploy
```bash
railway up
```

**Done!** Your app is live with automatic log rotation and cleanup.

---

## 💰 Cost Estimate

For a game with 50-100 games/day:

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| **Hosting** | $0-$7 | Free tier sufficient |
| **Logs** | $0 | Auto-rotated |
| **Memory** | $0 | Efficient cleanup |
| **Bandwidth** | $0 | Minimal data transfer |
| **Total** | **$0-$7/month** | 🎉 |

**Your app is designed to be free/cheap to run!**

---

## 🚨 Troubleshooting

### Memory Growing Over Time
1. Check `/stats` endpoint
2. Look for cleanup logs: `🧹 Cleaned up N stale room(s)`
3. Verify cleanup interval (should run every 10 min)
4. Restart app if stuck

### Too Many Logs
1. Set `LOG_LEVEL=error` in production
2. Enable log rotation (PM2 or cloud provider)
3. Delete old logs manually if needed

### Rooms Not Cleaning Up
1. Check server logs for cleanup messages
2. Verify periodic cleanup is running (every 10 min)
3. Manually trigger: `roomManager.cleanupStaleRooms()`

---

## 📞 Support

Monitor your app with:
- `/health` - Server status
- `/stats` - Memory and active rooms
- Server logs - Cleanup events

**Your app is production-ready with minimal costs!** 🎴✨
