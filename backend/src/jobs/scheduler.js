const cron = require('node-cron');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const { sendCheckIn, sendReminder } = require('../services/slackBot');
const { getMonday, isTimeMatch, isDayInTimezone } = require('../utils/dateHelpers');

/**
 * Check and send initial check-ins (Thursday 2-3 PM)
 */
async function runCheckInJob() {
  try {
    console.log('🕐 Running check-in job...');

    const users = await User.findAll();
    const weekStartDate = getMonday();

    for (const user of users) {
      // Check if it's the right day and time in user's timezone
      if (isDayInTimezone('thursday', user.timezone) && isTimeMatch('14:00', user.timezone)) {
        // Check if user already has a completed check-in
        const existingCheckIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

        if (!existingCheckIn || !existingCheckIn.completed_at) {
          try {
            // Get workspace ID (you may need to fetch this from config)
            const config = await WorkspaceConfig.findByWorkspaceId(process.env.SLACK_WORKSPACE_ID || 'default');
            await sendCheckIn(user.slack_user_id, config?.slack_workspace_id || 'default');
            console.log(`✓ Sent check-in to ${user.slack_username}`);
          } catch (error) {
            console.error(`✗ Failed to send check-in to ${user.slack_username}:`, error.message);
          }
        }
      }
    }

    console.log('✓ Check-in job completed');
  } catch (error) {
    console.error('Error in check-in job:', error);
  }
}

/**
 * Send first reminder (Friday 9-10 AM)
 */
async function runFirstReminderJob() {
  try {
    console.log('🕐 Running first reminder job...');

    const users = await User.findAll();
    const weekStartDate = getMonday();

    for (const user of users) {
      if (isDayInTimezone('friday', user.timezone) && isTimeMatch('09:00', user.timezone)) {
        const checkIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

        if (checkIn && !checkIn.completed_at && checkIn.reminded_count === 0) {
          try {
            await sendReminder(user.slack_user_id, 'first');
            console.log(`✓ Sent first reminder to ${user.slack_username}`);
          } catch (error) {
            console.error(`✗ Failed to send reminder to ${user.slack_username}:`, error.message);
          }
        }
      }
    }

    console.log('✓ First reminder job completed');
  } catch (error) {
    console.error('Error in first reminder job:', error);
  }
}

/**
 * Send final reminder (Friday 4 PM)
 */
async function runFinalReminderJob() {
  try {
    console.log('🕐 Running final reminder job...');

    const users = await User.findAll();
    const weekStartDate = getMonday();

    for (const user of users) {
      if (isDayInTimezone('friday', user.timezone) && isTimeMatch('16:00', user.timezone)) {
        const checkIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

        if (checkIn && !checkIn.completed_at) {
          try {
            await sendReminder(user.slack_user_id, 'final');
            console.log(`✓ Sent final reminder to ${user.slack_username}`);

            // TODO: Alert manager about incomplete check-in
            if (user.manager_id) {
              console.log(`⚠️  Alert: ${user.slack_username} hasn't completed check-in (Manager ID: ${user.manager_id})`);
            }
          } catch (error) {
            console.error(`✗ Failed to send final reminder to ${user.slack_username}:`, error.message);
          }
        }
      }
    }

    console.log('✓ Final reminder job completed');
  } catch (error) {
    console.error('Error in final reminder job:', error);
  }
}

/**
 * Start all scheduled jobs
 */
function start() {
  console.log('📅 Starting scheduler...');

  // Run every 10 minutes to check for scheduled tasks
  // This checks each user's timezone and triggers appropriately
  cron.schedule('*/10 * * * *', async () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday
    const hours = now.getHours();

    // Thursday 2-3 PM check-ins
    if (day === 4 && hours >= 14 && hours < 15) {
      await runCheckInJob();
    }

    // Friday 9-10 AM first reminder
    if (day === 5 && hours >= 9 && hours < 10) {
      await runFirstReminderJob();
    }

    // Friday 4-5 PM final reminder
    if (day === 5 && hours >= 16 && hours < 17) {
      await runFinalReminderJob();
    }
  });

  // Weekly job to advance rotating question (Sunday midnight)
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log('🔄 Rotating to next question...');
      const config = await WorkspaceConfig.findByWorkspaceId(process.env.SLACK_WORKSPACE_ID || 'default');
      if (config) {
        await WorkspaceConfig.incrementQuestionIndex(config.slack_workspace_id);
        console.log('✓ Question rotated successfully');
      }
    } catch (error) {
      console.error('Error rotating question:', error);
    }
  });

  console.log('✓ Scheduler started successfully');
  console.log('   - Check-ins: Thursday 2-3 PM (user timezone)');
  console.log('   - First reminder: Friday 9-10 AM (user timezone)');
  console.log('   - Final reminder: Friday 4-5 PM (user timezone)');
  console.log('   - Question rotation: Sunday 12:00 AM');
}

module.exports = {
  start,
  runCheckInJob,
  runFirstReminderJob,
  runFinalReminderJob
};
