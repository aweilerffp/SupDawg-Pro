# SupDawg Pro 🐕

**Team Pulse Check-in Bot for Slack - App Directory Version**

SupDawg Pro is a publicly available Slack app that conducts weekly pulse check-ins with team members via direct messages, collects structured feedback, and aggregates responses into a management dashboard. This is the multi-workspace version designed for distribution via the Slack App Directory.

## Features

- 📅 **Automated Weekly Check-ins**: Sends DMs every Thursday with personalized check-in questions
- 🔔 **Smart Reminders**: Friday morning and afternoon reminders for incomplete check-ins
- 🎯 **Rotating Questions**: Pre-loaded with 25 thoughtful questions that rotate weekly
- 📊 **Analytics Dashboard**: Track completion rates, average ratings, and trends over time
- 👥 **Team Management**: Admin panel for managing users and organizational structure
- 🔒 **Privacy Options**: Anonymous response viewing for sensitive topics
- 📈 **Export Data**: Download responses as CSV for further analysis
- 🌍 **Timezone Aware**: Sends messages based on each user's local timezone

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- @slack/bolt (Slack integration)
- node-cron (Scheduled jobs)
- Passport.js (OAuth)

### Frontend
- React 18
- TailwindCSS
- Recharts (Analytics)
- React Router

### Deployment
- PM2 (Process management)
- Nginx (Reverse proxy)
- Hetzner VPS

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Slack workspace with admin access
- Domain name (for production deployment)

## Installation

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/aweilerffp/SupDawg-Pro.git
cd SupDawg-Pro
\`\`\`

### 2. Backend Setup

\`\`\`bash
cd backend
npm install

# Create .env file
cp .env.example .env
\`\`\`

Edit \`.env\` with your configuration:

\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/supdawg_pro
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-random-session-secret
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BASE_URL=https://yourdomain.com
\`\`\`

### 3. Database Setup

\`\`\`bash
# Create PostgreSQL database
sudo -u postgres psql
CREATE DATABASE supdawg_pro;
CREATE USER supdawg_pro_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE supdawg_pro TO supdawg_pro_user;
\q

# Run migrations
npm run migrate
\`\`\`

### 4. Frontend Setup

\`\`\`bash
cd ../frontend
npm install
\`\`\`

### 5. Slack App Configuration

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "SupDawg Pro" and select your workspace

#### OAuth & Permissions

Add these Bot Token Scopes:
- \`chat:write\` - Send messages
- \`users:read\` - Get user info/timezones
- \`users:read.email\` - Get user emails
- \`im:write\` - Open DM channels
- \`im:history\` - Read DM responses

#### Event Subscriptions

**Important:** SupDawg Pro uses HTTP Request URLs (not Socket Mode) for App Directory compatibility.

1. Enable Event Subscriptions
2. Set Request URL to: \`https://yourdomain.com/slack/events\`
3. Subscribe to these bot events:
   - \`message.im\` - Receive DM messages

#### Interactivity & Shortcuts

1. Enable Interactivity
2. Set Request URL to: \`https://yourdomain.com/slack/interactions\`

#### OAuth & Install

1. Add Redirect URL: \`https://yourdomain.com/api/auth/slack/callback\`
2. Install the app to your workspace
3. Copy the Bot Token (starts with \`xoxb-\`) to \`.env\` as \`SLACK_BOT_TOKEN\`
4. Copy Signing Secret to \`.env\` as \`SLACK_SIGNING_SECRET\`

#### Public Distribution

To enable public distribution for the Slack App Directory:
1. Go to "Manage Distribution"
2. Activate Public Distribution
3. Complete all required App Directory information

## Development

### Run Backend

\`\`\`bash
cd backend
npm run dev
\`\`\`

### Run Frontend

\`\`\`bash
cd frontend
npm run dev
\`\`\`

Access the app at [http://localhost:5173](http://localhost:5173)

## Production Deployment

### 1. Build Frontend

\`\`\`bash
cd frontend
npm run build
\`\`\`

### 2. Setup Nginx

Create \`/etc/nginx/sites-available/supdawg\`:

\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /var/www/supdawg/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/supdawg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### 3. SSL Certificate

\`\`\`bash
sudo certbot --nginx -d yourdomain.com
\`\`\`

### 4. Start Backend with PM2

\`\`\`bash
cd backend
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
\`\`\`

## Usage

### Admin Setup

1. Sign in with Slack at \`https://yourdomain.com/login\`
2. Go to Admin Panel to:
   - View all team members
   - Assign managers to create org chart
   - Manage user status

### Question Management

1. Navigate to Questions page
2. Add, edit, or reorder rotating questions
3. Toggle questions active/inactive
4. Core questions are always asked

### Check-in Schedule

- **Thursday 2-3 PM**: Initial check-in sent to all active users
- **Friday 9-10 AM**: First reminder (if incomplete)
- **Friday 4-5 PM**: Final reminder + manager alert
- **Sunday 12 AM**: Question rotation

### Dashboard Features

- **Overview**: Current week completion rate and average rating
- **Trends**: Line chart showing ratings and completion over 8 weeks
- **Responses**: View all responses with anonymous toggle
- **Export**: Download CSV of all responses

## API Endpoints

### Authentication
- \`GET /api/auth/slack\` - Initiate Slack OAuth
- \`GET /api/auth/slack/callback\` - OAuth callback
- \`GET /api/auth/status\` - Check auth status
- \`POST /api/auth/logout\` - Logout

### Users
- \`GET /api/users\` - List all users
- \`GET /api/users/:id\` - Get user by ID
- \`POST /api/users\` - Create user
- \`PUT /api/users/:id\` - Update user
- \`POST /api/users/:id/deactivate\` - Deactivate user

### Questions
- \`GET /api/questions\` - List all questions
- \`GET /api/questions/rotating\` - Get rotating questions
- \`POST /api/questions\` - Create question
- \`PUT /api/questions/:id\` - Update question
- \`DELETE /api/questions/:id\` - Delete question
- \`POST /api/questions/reorder\` - Reorder questions

### Check-ins
- \`GET /api/check-ins\` - List check-ins with filters
- \`GET /api/check-ins/:id\` - Get check-in by ID
- \`GET /api/check-ins/week/:date/stats\` - Get week statistics

### Dashboard
- \`GET /api/dashboard/overview\` - Current week overview
- \`GET /api/dashboard/responses\` - All responses (with anonymous option)
- \`GET /api/dashboard/trends\` - Trends over time
- \`GET /api/dashboard/export\` - Export CSV

## Troubleshooting

### Bot not sending messages

1. Check Slack app is installed to workspace
2. Verify \`SLACK_BOT_TOKEN\` and \`SLACK_SIGNING_SECRET\` in \`.env\`
3. Ensure Event Subscriptions and Interactivity URLs are configured correctly
4. Verify your server is publicly accessible via HTTPS
5. Check PM2 logs: \`pm2 logs supdawg-pro-backend\`

### Check-ins not scheduled correctly

1. Verify server timezone: \`date\`
2. Check user timezones in database
3. Review scheduler logs in PM2

### Database connection errors

1. Verify PostgreSQL is running: \`sudo systemctl status postgresql\`
2. Check \`DATABASE_URL\` in \`.env\`
3. Ensure database and user exist

### Frontend not loading

1. Check Nginx configuration: \`sudo nginx -t\`
2. Verify frontend build: \`cd frontend && npm run build\`
3. Check file permissions: \`ls -la /var/www/supdawg/frontend/dist\`

## Pre-loaded Questions

The system comes with 25 rotating questions including:

1. What's your biggest challenge right now, and how can I help?
2. What do you find best helps you manage stress?
3. What is your favorite part of your job? Why's that?
4. When do you feel most productive and motivated when working?
5. Any ideas you have to improve your role or the company?
... and 20 more!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues or questions, please contact your system administrator or file an issue in the repository.

---

Built with ❤️ for better team communication
