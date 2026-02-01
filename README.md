# 🎴 Least Count - Multiplayer Card Game

A real-time multiplayer card game popular in India, built with React, TypeScript, Socket.IO, and Node.js.

## 🎯 Game Rules

- **Players:** 2-10 players
- **Objective:** Have the lowest score or be the last player remaining
- **Starting Hand:** 7 cards per player
- **Card Values:**
  - Ace = 1 point
  - 2-9 = Face value
  - 10, J, Q, K = 10 points
  - Joker = 0 points (wild card)

### Gameplay

1. Each round starts with a wild card being revealed - all cards of that rank become worth 0 points
2. Players take turns drawing a card (from deck or discard pile) and discarding cards
3. You can discard multiple cards of the same rank together
4. Call "SHOW" when your hand total is ≤ 10 points:
   - **Good Show:** If you have the lowest hand, you get 0 points ✅
   - **Bad Show:** If someone has lower/equal, you get 40 penalty points ❌

### Winning

**Point Limit Mode:** First to reach the limit (default 200) is eliminated. Last player standing wins.

**Round Limit Mode:** Play fixed number of rounds. Player with lowest total score wins.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd least_count
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

### Running Locally (Self-Hosted)

1. Start the server (in `server` directory):
```bash
npm run dev
```
Server will run on `http://localhost:3001`

2. Start the client (in `client` directory):
```bash
npm run dev
```
Client will run on `http://localhost:3000`

3. Open your browser and navigate to `http://localhost:3000`

4. To play with friends on the same network:
   - Find your local IP address (e.g., `192.168.1.100`)
   - Share `http://YOUR_IP:3000` with friends
   - They can join using the room code

## 🎮 How to Play

### Creating a Game

1. Click "Create New Game"
2. Enter your name
3. Choose game end condition:
   - **Point Limit:** Set the elimination score (default 200)
   - **Round Limit:** Set number of rounds to play (default 5)
4. Share the 6-digit room code with friends

### Joining a Game

1. Click "Join Existing Game"
2. Enter your name
3. Enter the 6-digit room code
4. Wait for host to start the game

### During Your Turn (30 seconds)

1. **Draw:** Choose to draw from deck or discard pile
2. **Discard:** Select card(s) of the same rank to discard
3. **Show (Optional):** If your hand is ≤ 10, you can call show

If you don't play within 30 seconds, the game will auto-play for you (draws from deck and discards highest card).

### Scoreboard

Click the "📊 Scoreboard" button anytime to view:
- Round-by-round scores for all players
- Current total scores
- Elimination status

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Vite

**Backend:**
- Node.js
- Express
- Socket.IO
- TypeScript

## 📁 Project Structure

```
least_count/
├── server/                 # Backend server
│   ├── src/
│   │   ├── game/          # Game logic
│   │   │   ├── Deck.ts
│   │   │   ├── GameRoom.ts
│   │   │   └── RoomManager.ts
│   │   ├── socket/        # Socket handlers
│   │   ├── types/         # TypeScript types
│   │   └── server.ts      # Main server file
│   └── package.json
│
├── client/                # Frontend client
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Card.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── PlayerAvatar.tsx
│   │   │   ├── Scoreboard.tsx
│   │   │   └── WaitingRoom.tsx
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Helper functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
└── README.md
```

## 🎨 Features

✅ Real-time multiplayer (2-10 players)
✅ Room-based matchmaking with 6-digit codes
✅ Configurable game modes (Point Limit / Round Limit)
✅ 30-second turn timer with auto-play
✅ Beautiful, mobile-responsive UI
✅ Circular player layout
✅ Wild card system
✅ Score tracking across rounds
✅ Player elimination system
✅ Disconnect/reconnect handling

## 🔮 Future Enhancements (Optional)

- Player statistics and game history
- Chat system
- Emojis and reactions
- Custom avatars
- Sound effects and animations
- Leaderboards
- Tournament mode

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 💬 Support

For issues or questions, please open an issue on GitHub.

---

**Enjoy playing Least Count! 🎴🎯**
