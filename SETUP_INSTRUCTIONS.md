# 🚀 Setup Instructions for Least Count Game

## Prerequisites Installation

### 1. Install Node.js and npm

You need Node.js (v18 or higher) to run this application.

**For macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

**For Windows:**
- Download the installer from https://nodejs.org/
- Run the installer and follow the prompts

**For Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### 2. Verify Installation

After installing Node.js, verify it's working:

```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

## 📦 Project Setup

### Step 1: Install Server Dependencies

```bash
cd /Users/byeswanth/personal/least_count/server
npm install
```

### Step 2: Install Client Dependencies

```bash
cd /Users/byeswanth/personal/least_count/client
npm install
```

## 🎮 Running the Game

### Option 1: Run Both Server and Client (Recommended)

**Terminal 1 - Start Server:**
```bash
cd /Users/byeswanth/personal/least_count/server
npm run dev
```
Server will run on `http://localhost:3001`

**Terminal 2 - Start Client:**
```bash
cd /Users/byeswanth/personal/least_count/client
npm run dev
```
Client will run on `http://localhost:3000`

### Option 2: Quick Start Script

Create a script to run both:

**For macOS/Linux, create `start.sh`:**
```bash
#!/bin/bash
cd server && npm run dev &
cd client && npm run dev
```

Then run:
```bash
chmod +x start.sh
./start.sh
```

## 🌐 Playing with Friends on Your Network

### 1. Find Your Local IP Address

**macOS:**
```bash
ipconfig getifaddr en0
# Or check System Preferences > Network
```

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your active network
```

**Linux:**
```bash
hostname -I | awk '{print $1}'
```

### 2. Share the URL

If your IP is `192.168.1.100`, share this with friends:
```
http://192.168.1.100:3000
```

They must be on the same WiFi network!

### 3. Firewall Settings

If friends can't connect, you may need to allow port 3000 and 3001:

**macOS:**
- System Preferences > Security & Privacy > Firewall > Firewall Options
- Add Node to allowed apps

**Windows:**
- Windows Defender Firewall > Allow an app
- Add Node.js

## 🔧 Troubleshooting

### "Cannot connect to server"

1. Make sure server is running (Terminal 1)
2. Check server is on port 3001: `http://localhost:3001/health`
3. Check client is trying to connect to correct URL

### "npm: command not found"

Node.js is not installed or not in PATH. Follow Step 1 above.

### "Port already in use"

Another application is using port 3000 or 3001:

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Client can't connect to server

Update the socket URL in client:

Create `/Users/byeswanth/personal/least_count/client/.env`:
```
VITE_SOCKET_URL=http://localhost:3001
```

## 📱 Mobile Testing

To test on your phone:
1. Make sure phone is on same WiFi as computer
2. Find your computer's IP (see above)
3. Open `http://YOUR_IP:3000` on phone browser

## 🎯 Next Steps

Once everything is running:

1. Open `http://localhost:3000` in your browser
2. Click "Create New Game"
3. Share the room code with friends
4. Friends can join at the same URL by clicking "Join Game"
5. Host starts the game when everyone is ready

## 📞 Need Help?

If you encounter issues:
1. Check both terminals for error messages
2. Verify Node.js version is 18+
3. Make sure ports 3000 and 3001 are not blocked
4. Try restarting both server and client

---

**Enjoy playing Least Count! 🎴**
