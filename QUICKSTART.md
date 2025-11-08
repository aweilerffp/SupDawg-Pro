# SupDawg Quick Start Guide

Get SupDawg up and running in 10 minutes!

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js v18+ installed
- ✅ PostgreSQL v14+ installed and running
- ✅ A Slack workspace with admin access
- ✅ (Optional) Domain name for production

## Step 1: Install Dependencies

\`\`\`bash
cd SupDawg/backend
npm install

cd ../frontend
npm install
\`\`\`

## Step 2: Configure Slack App

### Create Slack App

1. Visit [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name: **SupDawg**
4. Select your workspace

### Configure Permissions

**OAuth & Permissions** → Add Bot Token Scopes:
- \`chat:write\`
- \`users:read\`
- \`im:write\`
- \`im:history\`

### Enable Socket Mode

1. **Socket Mode** → Toggle **Enable Socket Mode**
2. Generate **App-Level Token** with \`connections:write\` scope
3. Copy token (starts with \`xapp-\`)

### Subscribe to Events

**Event Subscriptions** → Subscribe to bot events:
- \`message.im\`

### Install to Workspace

1. **Install App** → Click **Install to Workspace**
2. Authorize the app
3. Copy **Bot User OAuth Token** (starts with \`xoxb-\`)

## Step 3: Setup Database

\`\`\`bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE supdawg;
CREATE USER supdawg_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE supdawg TO supdawg_user;
\q
\`\`\`

## Step 4: Configure Environment

\`\`\`bash
cd backend
cp .env.example .env
\`\`\`

Edit \`.env\`:

\`\`\`env
DATABASE_URL=postgresql://supdawg_user:your_secure_password@localhost:5432/supdawg

SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

SESSION_SECRET=generate-random-string-here
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:3000
\`\`\`

💡 **Tip**: Find Slack credentials in your Slack App settings:
- Bot Token: **OAuth & Permissions** page
- App Token: **Basic Information** → **App-Level Tokens**
- Signing Secret: **Basic Information** → **App Credentials**
- Client ID/Secret: **Basic Information** → **App Credentials**

## Step 5: Run Database Migration

\`\`\`bash
cd backend
npm run migrate
\`\`\`

You should see:
\`\`\`
✓ Database migration completed successfully!
✓ Tables created: users, questions, check_ins, responses, workspace_config
✓ Core questions and rotating questions inserted
\`\`\`

## Step 6: Start Development Servers

### Terminal 1 - Backend

\`\`\`bash
cd backend
npm run dev
\`\`\`

Expected output:
\`\`\`
🐕 SupDawg server running on port 3000
⚡ SupDawg Slack bot is running!
📅 Scheduler started successfully
\`\`\`

### Terminal 2 - Frontend

\`\`\`bash
cd frontend
npm run dev
\`\`\`

Expected output:
\`\`\`
VITE ready in X ms
➜ Local: http://localhost:5173/
\`\`\`

## Step 7: Test the Application

1. Open [http://localhost:5173](http://localhost:5173) in your browser
2. Click **"Sign in with Slack"**
3. Authorize the app
4. You should be redirected to the dashboard!

## Step 8: Test Check-in Flow

### Option A: Wait for Scheduled Time
Check-ins automatically send Thursday 2-3 PM (user's timezone)

### Option B: Manual Test

Use the Slack bot test script:

\`\`\`bash
cd backend
node -e "
const { sendCheckIn } = require('./src/services/slackBot');
sendCheckIn('YOUR_SLACK_USER_ID', 'default')
  .then(() => console.log('Check-in sent!'))
  .catch(console.error);
"
\`\`\`

Replace \`YOUR_SLACK_USER_ID\` with your Slack user ID (find it in your Slack profile)

## Verify Everything Works

✅ **Backend running** on port 3000
✅ **Frontend running** on port 5173
✅ **Can sign in with Slack**
✅ **Dashboard loads with empty data**
✅ **Can navigate to Admin Panel, Questions, Responses**

## Common Issues

### "Connection refused" when signing in

**Solution**: Ensure backend is running and \`BASE_URL\` in \`.env\` is correct

### "Database connection error"

**Solution**:
1. Check PostgreSQL is running: \`sudo systemctl status postgresql\`
2. Verify \`DATABASE_URL\` in \`.env\`
3. Ensure database user has correct permissions

### Slack bot not responding

**Solution**:
1. Check Socket Mode is enabled in Slack App settings
2. Verify \`SLACK_APP_TOKEN\` starts with \`xapp-\`
3. Ensure bot is installed to workspace
4. Check backend logs for errors

### "Migration failed"

**Solution**:
1. Drop and recreate database:
   \`\`\`sql
   DROP DATABASE supdawg;
   CREATE DATABASE supdawg;
   \`\`\`
2. Run migration again: \`npm run migrate\`

## Next Steps

1. **Add Team Members**: Go to Admin Panel → Add users manually or they'll be auto-created on first check-in
2. **Configure Questions**: Go to Questions → Add/edit rotating questions
3. **Set Manager Relationships**: Admin Panel → Assign managers to users
4. **Test Check-in**: Send a test check-in to yourself via Slack

## Production Deployment

Ready for production? See [README.md](./README.md#production-deployment) for:
- Setting up Nginx reverse proxy
- Configuring SSL with Let's Encrypt
- Deploying with PM2
- Using the automated deployment script

## Need Help?

- 📖 Full documentation: [README.md](./README.md)
- 🐛 Found a bug? Check the logs:
  - Backend: \`pm2 logs supdawg-backend\` (production) or check terminal (dev)
  - Browser: Open DevTools Console (F12)

---

**You're all set! 🎉**

Your team will receive their first check-in next Thursday afternoon.
