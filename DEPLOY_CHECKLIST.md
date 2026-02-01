# ✅ Render Deployment Checklist

## Pre-Deployment (Do Once)

- [ ] **Push to GitHub**
  ```bash
  git status
  git add .
  git commit -m "Ready for Render deployment"
  git push origin master
  ```

- [ ] **Create Render Account**
  - Go to [render.com](https://render.com)
  - Sign up with GitHub

---

## Deploy Backend (5 minutes)

1. [ ] **Create Web Service**
   - Dashboard → "New +" → "Web Service"
   - Connect your GitHub repo: `least_count`

2. [ ] **Configure Settings**
   ```
   Name: least-count-server
   Region: Singapore
   Branch: master
   Root Directory: server
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Instance Type: Free
   ```

3. [ ] **Add Environment Variables**
   ```
   LOG_LEVEL = error
   NODE_ENV = production
   ```

4. [ ] **Deploy and Copy URL**
   - Click "Create Web Service"
   - Wait 2-3 minutes
   - Copy URL: `https://least-count-server-XXXX.onrender.com`

---

## Deploy Frontend (5 minutes)

1. [ ] **Create Static Site**
   - Dashboard → "New +" → "Static Site"
   - Select same GitHub repo

2. [ ] **Configure Settings**
   ```
   Name: least-count-client
   Region: Singapore
   Branch: master
   Root Directory: client
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```

3. [ ] **Add Environment Variable** ⚠️ IMPORTANT
   ```
   VITE_SOCKET_URL = [YOUR BACKEND URL FROM STEP ABOVE]
   ```
   Example: `https://least-count-server-abc123.onrender.com`

4. [ ] **Deploy and Copy URL**
   - Click "Create Static Site"
   - Wait 2-3 minutes
   - Copy URL: `https://least-count-client-XXXX.onrender.com`

---

## Update Backend CORS (2 minutes)

1. [ ] **Add Frontend URL to Backend**
   - Go to backend service: "least-count-server"
   - Click "Environment" tab
   - Add variable:
     ```
     CORS_ORIGIN = [YOUR FRONTEND URL]
     ```
     Example: `https://least-count-client-abc123.onrender.com`
   - Save (will auto-redeploy)

---

## Test Deployment (2 minutes)

1. [ ] **Test Backend Health**
   - Open: `https://YOUR-BACKEND-URL/health`
   - Should see: `{"status":"ok","timestamp":"..."}`

2. [ ] **Test Frontend**
   - Open: `https://YOUR-FRONTEND-URL`
   - Click "Create New Game"
   - Enter name and create
   - If it works → SUCCESS! 🎉

3. [ ] **Test with Friend**
   - Share frontend URL with a friend
   - They join with room code
   - Play a quick round

---

## Your Deployment URLs

Fill these in after deployment:

```
Backend:  https://___________________________.onrender.com
Frontend: https://___________________________.onrender.com

Share this with friends: [Frontend URL]
```

---

## Troubleshooting

### Frontend shows "Connecting to server..."
- Check CORS_ORIGIN is set in backend
- Check VITE_SOCKET_URL is set in frontend
- Make sure backend URL is correct (no trailing slash)

### Backend won't start
- Check logs in Render dashboard
- Verify build command ran successfully
- Check all dependencies are in package.json

### Cold Start (First player waits 30-60s)
- This is normal on free tier
- Backend sleeps after 15 min inactivity
- Pro tip: Open the site 1 minute before friends join

---

## Next Steps

- [ ] Share frontend URL with friends
- [ ] Test a full game
- [ ] Monitor backend at `/stats` endpoint
- [ ] Enjoy! 🎴

**Total Time: ~15 minutes**
**Cost: $0/month**
