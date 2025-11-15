# SupDawg Pro - App Directory Setup Guide

This document outlines the migration from SupDawg (internal) to SupDawg Pro (public App Directory version).

## ✅ Completed Work

### Phase 1: Repository & Branding
- [x] Created `SupDawg-Pro` GitHub repository
- [x] Updated all branding (README, package.json, frontend)
- [x] Changed app name to "SupDawg Pro" throughout the codebase
- [x] Updated database naming to `supdawg_pro`

### Phase 2: Socket Mode → HTTP Request URLs
- [x] Replaced Socket Mode with ExpressReceiver
- [x] Removed `socketMode: true` and `appToken` configuration
- [x] Integrated Bolt receiver with Express server
- [x] Created `/slack/events` endpoint for Slack events
- [x] Removed SLACK_APP_TOKEN from environment variables
- [x] Updated documentation to reference HTTP Request URLs

### Phase 3: Multi-Workspace Database Schema
- [x] Created `workspace_installations` table
- [x] Added `workspace_id` foreign key to `users` table
- [x] Added `workspace_id` foreign key to `questions` table
- [x] Updated `workspace_config` to reference `workspace_id`
- [x] Added proper indexes for workspace queries
- [x] Updated UNIQUE constraints for multi-workspace support

### Phase 4: Models & Infrastructure
- [x] Created `WorkspaceInstallation` model with CRUD operations
- [x] Implemented upsert logic for re-installations
- [x] Added workspace deletion support for uninstalls

---

## 🚧 Remaining Work

### Critical: OAuth & Installation Flow

**What needs to be done:**
The current OAuth flow is designed for single-workspace user authentication. For App Directory submission, you need workspace-level installation OAuth.

**Files that need updates:**

#### 1. `backend/src/services/slackBot.js`
Add installation store to automatically save workspace installations:

```javascript
const { ExpressReceiver } = require('@slack/bolt');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  // Add installation store
  installationStore: {
    storeInstallation: async (installation) => {
      const WorkspaceInstallation = require('../models/WorkspaceInstallation');
      await WorkspaceInstallation.create({
        team_id: installation.team.id,
        team_name: installation.team.name,
        bot_token: installation.bot.token,
        bot_user_id: installation.bot.userId,
        bot_access_token: installation.bot.token
      });
    },
    fetchInstallation: async (installQuery) => {
      const WorkspaceInstallation = require('../models/WorkspaceInstallation');
      const installation = await WorkspaceInstallation.findByTeamId(installQuery.teamId);
      if (!installation) {
        throw new Error('Installation not found');
      }
      return {
        team: { id: installation.team_id, name: installation.team_name },
        bot: {
          token: installation.bot_token,
          userId: installation.bot_user_id,
          scopes: ['chat:write', 'users:read', 'users:read.email', 'im:write', 'im:history']
        }
      };
    },
    deleteInstallation: async (installQuery) => {
      const WorkspaceInstallation = require('../models/WorkspaceInstallation');
      await WorkspaceInstallation.delete(installQuery.teamId);
    }
  }
});
```

#### 2. Update all models to be workspace-aware

**User.js, Question.js, CheckIn.js, WorkspaceConfig.js** all need updates to:
- Accept `workspace_id` parameter in create/update methods
- Filter queries by `workspace_id`
- Handle workspace context properly

Example for `User.create()`:
```javascript
static async create(userData) {
  const { workspace_id, slack_user_id, slack_username, email, timezone, manager_id, is_admin } = userData;
  const query = `
    INSERT INTO users (workspace_id, slack_user_id, slack_username, email, timezone, manager_id, is_admin)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const values = [workspace_id, slack_user_id, slack_username, email, timezone || 'America/New_York', manager_id, is_admin || false];
  const result = await db.query(query, values);
  return result.rows[0];
}
```

#### 3. Update `slackBot.js` event handlers

Add workspace context to all operations:

```javascript
app.action(/rating_\d/, async ({ action, ack, say, body }) => {
  await ack();

  const userId = body.user.id;
  const teamId = body.team.id;

  // Get workspace from database
  const workspace = await WorkspaceInstallation.findByTeamId(teamId);

  // Use workspace.id for all database operations
  let user = await User.findBySlackUserId(userId, workspace.id);

  // ... rest of handler
});
```

#### 4. Update scheduler jobs

`backend/src/jobs/scheduler.js` needs to:
- Loop through all workspaces
- Process users per workspace
- Use workspace-specific configuration

```javascript
async function runCheckInJob() {
  const workspaces = await WorkspaceInstallation.findAll();

  for (const workspace of workspaces) {
    const users = await User.findAll(workspace.id, true);
    const config = await WorkspaceConfig.findByWorkspaceId(workspace.id);

    // ... process users for this workspace
  }
}
```

---

## 📋 Manual Slack App Configuration

### Step 1: Create New Slack App for Pro

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "SupDawg Pro"
4. Select your development workspace

### Step 2: Configure OAuth & Permissions

**Bot Token Scopes:**
- `chat:write` - Send messages
- `users:read` - Get user info
- `users:read.email` - Get user emails
- `im:write` - Open DM channels
- `im:history` - Read DM messages

**Redirect URLs:**
```
https://yourdomain.com/api/auth/slack/callback
https://yourdomain.com/slack/oauth_redirect
```

### Step 3: Enable Event Subscriptions

1. Toggle on "Enable Events"
2. Set Request URL: `https://yourdomain.com/slack/events`
3. Slack will send a verification challenge - your server must be running!

**Subscribe to Bot Events:**
- `message.im` - Receive DM messages

### Step 4: Enable Interactivity & Shortcuts

1. Toggle on "Interactivity"
2. Set Request URL: `https://yourdomain.com/slack/events`

### Step 5: Manage Distribution

1. Go to "Manage Distribution"
2. Click "Activate Public Distribution"
3. Fill out App Directory information:
   - Short description
   - Long description
   - Icon & preview images
   - Support email
   - Privacy policy URL
   - etc.

### Step 6: Submit to App Directory

After completing all steps above and testing thoroughly:
1. Click "Submit to App Directory"
2. Address any validation errors
3. Wait for Slack approval

---

## 🧪 Testing Checklist

Before submitting to App Directory:

- [ ] Test installation in a fresh workspace
- [ ] Verify check-in messages are sent
- [ ] Test button interactions work
- [ ] Test DM conversation flow
- [ ] Verify scheduled jobs run correctly
- [ ] Test uninstallation (cleanup database)
- [ ] Test re-installation (upsert works)
- [ ] Verify multi-workspace isolation (install in 2+ workspaces)
- [ ] Check all admin panel features work
- [ ] Test OAuth flow end-to-end
- [ ] Verify error handling and logging

---

## 🚀 Deployment Recommendations

### Local Testing

Use ngrok to test Slack webhooks locally:
```bash
ngrok http 3000
# Use ngrok URL in Slack app configuration
```

### Production Deployment

1. **Database Setup:**
```bash
sudo -u postgres psql
CREATE DATABASE supdawg_pro;
CREATE USER supdawg_pro_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE supdawg_pro TO supdawg_pro_user;
\q

cd backend
npm run migrate
```

2. **Environment Variables:**
Update `.env` with production values (no SLACK_APP_TOKEN needed)

3. **Build & Deploy:**
```bash
cd frontend
npm run build

# Copy to web server
cp -r dist/* /var/www/supdawg-pro/dist/

# Restart backend with PM2
pm2 restart supdawg-pro-backend
```

4. **Nginx Configuration:**
Ensure `/slack/events` endpoint is accessible:
```nginx
location /slack/events {
    proxy_pass http://localhost:3000/slack/events;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 📊 Migration Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Repository | ✅ Complete | https://github.com/aweilerffp/SupDawg-Pro |
| Branding | ✅ Complete | Updated all references to "Pro" |
| HTTP Request URLs | ✅ Complete | Socket Mode removed |
| Database Schema | ✅ Complete | Multi-workspace support added |
| Models | ⚠️ Partial | WorkspaceInstallation done, others need updates |
| OAuth Flow | ❌ Pending | Installation store and handlers needed |
| Scheduler | ❌ Pending | Multi-workspace loop needed |
| Event Handlers | ❌ Pending | Workspace context needed |
| Testing | ❌ Pending | Full test suite needed |

---

## 🔗 Helpful Links

- [Slack App Directory Guidelines](https://api.slack.com/start/distributing/guidelines)
- [Bolt for JavaScript - Installation Store](https://slack.dev/bolt-js/concepts#installation-stores)
- [OAuth for Slack Apps](https://api.slack.com/authentication/oauth-v2)
- [Event Subscriptions](https://api.slack.com/events-api)

---

## 📝 Next Steps

1. **Immediate:**
   - Complete OAuth installation flow
   - Update all models for workspace isolation
   - Test with ngrok locally

2. **Before Submission:**
   - Update all event handlers with workspace context
   - Fix scheduler for multi-workspace
   - Complete full testing checklist
   - Write privacy policy and support docs

3. **After Approval:**
   - Monitor installations
   - Set up error tracking (Sentry, etc.)
   - Plan for scaling (if many installations)

---

**Questions or Issues?** Check the Slack API documentation or open an issue in the repository.
