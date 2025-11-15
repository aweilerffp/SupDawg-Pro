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
    const users = await User.findAll();
    const weekStartDate = getMonday();

    // Get workspace config for check-in day/time settings
    const config = await WorkspaceConfig.findByWorkspaceId(process.env.SLACK_WORKSPACE_ID || 'default');
    const checkInDay = config?.check_in_day || 'thursday';
    const checkInTime = config?.check_in_time || '14:00';

    for (const user of users) {
      // Check if it's the right day and time in user's timezone
      if (isDayInTimezone(checkInDay, user.timezone) && isTimeMatch(checkInTime, user.timezone)) {
        // Check if user already has a completed check-in
        const existingCheckIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

        if (!existingCheckIn || !existingCheckIn.completed_at) {
          try {
            await sendCheckIn(user.slack_user_id, config?.slack_workspace_id || 'default');
            console.log(`✓ Sent check-in to ${user.slack_username}`);
          } catch (error) {
            console.error(`✗ Failed to send check-in to ${user.slack_username}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in check-in job:', error);
  }
}

/**
 * Send reminders based on configured times
 */
async function runFirstReminderJob() {
  try {
    const users = await User.findAll();
    const weekStartDate = getMonday();

    // Get workspace config for reminder settings
    const config = await WorkspaceConfig.findByWorkspaceId(process.env.SLACK_WORKSPACE_ID || 'default');
    const checkInDay = config?.check_in_day || 'thursday';
    const reminderTimes = config?.reminder_times || ['09:00', '16:00'];

    // Parse reminder_times if it's a string
    const times = typeof reminderTimes === 'string' ? JSON.parse(reminderTimes) : reminderTimes;

    // Calculate next day after check-in
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const checkInDayIndex = dayNames.indexOf(checkInDay.toLowerCase());
    const reminderDayIndex = (checkInDayIndex + 1) % 7;
    const reminderDay = dayNames[reminderDayIndex];

    for (const user of users) {
      if (isDayInTimezone(reminderDay, user.timezone)) {
        const checkIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

        if (checkIn && !checkIn.completed_at) {
          // Check each configured reminder time
          for (let i = 0; i < times.length; i++) {
            const time = times[i];
            if (isTimeMatch(time, user.timezone)) {
              // Only send if we haven't sent this reminder yet
              if (checkIn.reminded_count <= i) {
                try {
                  await sendReminder(user.slack_user_id, i === times.length - 1 ? 'final' : 'first');
                  console.log(`✓ Sent reminder ${i + 1} to ${user.slack_username}`);
                } catch (error) {
                  console.error(`✗ Failed to send reminder to ${user.slack_username}:`, error.message);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in reminder job:', error);
  }
}

/**
 * Alias for backward compatibility
 */
async function runFinalReminderJob() {
  // Reminders are now handled by runFirstReminderJob
  // This is kept for backward compatibility but does nothing
}

/**
 * Start all scheduled jobs
 */
function start() {
  console.log('📅 Starting scheduler...');

  // Run every 30 minutes to check for scheduled tasks
  // This checks each user's timezone and triggers appropriately
  // No UTC time restrictions - the jobs themselves check user timezones
  cron.schedule('*/30 * * * *', async () => {
    // Always run all jobs - they check user timezones internally
    await runCheckInJob();
    await runFirstReminderJob();
    await runFinalReminderJob();
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
  console.log('   - Running every 30 minutes to check all user timezones');
  console.log('   - Check-ins: Configured day/time per Settings (user timezone)');
  console.log('   - Reminders: Configured times per Settings (user timezone)');
  console.log('   - Question rotation: Sunday 12:00 AM UTC');
}

module.exports = {
  start,
  runCheckInJob,
  runFirstReminderJob,
  runFinalReminderJob
};
