# OMNI AI 

WhatsApp bot using **whatsapp-web.js** with **phone number pairing code**.
No QR code. No WhatsApp Business API needed!

## How Pairing Code Works

1. Start the bot
2. An 8-digit pairing code appears in the terminal
3. On your phone: WhatsApp → Settings → Linked Devices → **Link with phone number**
4. Enter the pairing code
5. Your German number (`+49 1634515397`) is now OMNI!

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Install yt-dlp (for YouTube downloads)
```bash
pip install yt-dlp
```

### 3. Run the bot
```bash
npm start
```

### 4. Pair your phone
- Look at the terminal for the **PAIRING CODE**
- On your phone: WhatsApp → Settings → Linked Devices → **Link with phone number**
- Enter the 8-digit code
- Done!

### 5. Check status
Open `http://localhost:3000/pairing` to see pairing status.

## Commands

| Command | What Happens |
|---------|-------------|
| `OMNI` | Welcome message |
| `OMNI help` | List all commands |
| `OMNI hello` | Greeting |
| `OMNI code python` | Code example |
| `OMNI song <YouTube URL>` | Download & send MP3 |
| `OMNI video <YouTube URL>` | Download & send video |
| `OMNI generate <description>` | Create AI image |
| `OMNI status` | Check bot status |

## Features

- ✅ **Pairing code** (no QR scan needed)
- ✅ Tag-only responses (must start with "OMNI")
- ✅ YouTube song/video download
- ✅ AI image generation (free, no API key)
- ✅ Send any media type
- ✅ Works with your real German number
- ✅ **Group chat support** (bot can be added to groups!)
- ✅ No Meta API needed

## Important Notes

- Your phone must stay online
- The bot runs on your computer/server
- If you log out of WhatsApp Web, restart the bot
- Pairing code is shown once — if missed, restart the bot
