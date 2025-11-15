const { App } = require('@slack/bolt');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Question = require('../models/Question');
const Response = require('../models/Response');
const WorkspaceConfig = require('../models/WorkspaceConfig');
const { getMonday } = require('../utils/dateHelpers');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Store active check-in sessions (user_id -> check-in data)
const activeCheckIns = new Map();

/**
 * Send check-in questions to a user
 */
async function sendCheckIn(slackUserId, workspaceId) {
  try {
    console.log(`📤 Sending check-in to user: ${slackUserId}`);

    // Get or create user
    let user = await User.findBySlackUserId(slackUserId);
    if (!user) {
      // Fetch user info from Slack
      const userInfo = await app.client.users.info({ user: slackUserId });
      user = await User.create({
        slack_user_id: slackUserId,
        slack_username: userInfo.user.name,
        email: userInfo.user.profile.email,
        timezone: userInfo.user.tz || 'America/New_York'
      });
    }

    // Check if user already has a check-in for this week
    const weekStartDate = getMonday();
    let checkIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

    if (checkIn && checkIn.completed_at) {
      console.log(`✓ User ${slackUserId} already completed check-in for this week`);
      return { alreadyCompleted: true };
    }

    // Create or get check-in
    if (!checkIn) {
      checkIn = await CheckIn.create(user.id, weekStartDate);
    }

    // Get questions using type-based lookups
    const ratingQuestion = await Question.getQuestionByType('rating');
    const wentWellQuestion = await Question.getQuestionByType('what_went_well');
    const didntGoWellQuestion = await Question.getQuestionByType('what_didnt_go_well');

    const config = await WorkspaceConfig.findByWorkspaceId(workspaceId);
    const currentQuestionIndex = config ? config.current_question_index : 0;
    const rotatingQuestion = await Question.getCurrentRotatingQuestion(currentQuestionIndex);

    // Validate that all core questions are present
    if (!ratingQuestion || !wentWellQuestion || !didntGoWellQuestion) {
      console.error('Missing core questions! Cannot send check-in.');
      throw new Error('System is missing required core questions. Please contact administrator.');
    }

    // Store check-in session
    activeCheckIns.set(slackUserId, {
      checkInId: checkIn.id,
      userId: user.id,
      step: 'rating',
      questions: {
        rating: ratingQuestion,
        wentWell: wentWellQuestion,
        didntGoWell: didntGoWellQuestion,
        rotating: rotatingQuestion
      },
      responses: {}
    });

    // Send DM with questions
    const message = {
      channel: slackUserId,
      text: `Hey! 👋 Time for your weekly pulse check-in!`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🐕 Weekly Pulse Check-in',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey there! It's time for your weekly check-in. This should only take a couple of minutes.`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Question 1:* ${ratingQuestion.question_text}\n\n_(1 = Terrible, 5 = Excellent)_`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '1' },
              value: '1',
              action_id: 'rating_1'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '2' },
              value: '2',
              action_id: 'rating_2'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '3' },
              value: '3',
              action_id: 'rating_3'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '4' },
              value: '4',
              action_id: 'rating_4'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '5' },
              value: '5',
              action_id: 'rating_5'
            }
          ]
        }
      ]
    };

    await app.client.chat.postMessage(message);
    console.log(`✓ Check-in sent to user ${slackUserId}`);

    return { success: true, checkInId: checkIn.id };
  } catch (error) {
    console.error('Error sending check-in:', error);
    throw error;
  }
}

/**
 * Handle rating button clicks
 */
app.action(/rating_\d/, async ({ action, ack, say, body }) => {
  await ack();

  const userId = body.user.id;
  const rating = parseInt(action.value);
  const session = activeCheckIns.get(userId);

  if (!session) {
    await say("Sorry, I couldn't find your active check-in. Please try again later.");
    return;
  }

  session.responses.rating = rating;
  session.step = 'went_well';

  await say({
    text: 'Great! Next question...',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✓ You rated your week a *${rating}/5*`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Question 2:* ${session.questions.wentWell.question_text}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Please type your answer below..._'
        }
      }
    ]
  });
});

/**
 * Handle text responses
 */
app.message(async ({ message, say }) => {
  const userId = message.user;
  const session = activeCheckIns.get(userId);

  if (!session) {
    return; // Not in active check-in
  }

  const text = message.text;

  if (session.step === 'went_well') {
    session.responses.wentWell = text;
    session.step = 'didnt_go_well';

    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✓ Got it! "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Question 3:* ${session.questions.didntGoWell.question_text}`
          }
        }
      ]
    });
  } else if (session.step === 'didnt_go_well') {
    session.responses.didntGoWell = text;
    session.step = 'rotating';

    const rotatingQ = session.questions.rotating;
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✓ Thanks for sharing.`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Question 4:* ${rotatingQ ? rotatingQ.question_text : 'What can we do to support you better?'}`
          }
        }
      ]
    });
  } else if (session.step === 'rotating') {
    session.responses.rotating = text;

    // Save all responses to database
    try {
      await CheckIn.updateResponses(session.checkInId, {
        rating: session.responses.rating,
        what_went_well: session.responses.wentWell,
        what_didnt_go_well: session.responses.didntGoWell
      });

      // Save rotating question response
      if (session.questions.rotating) {
        await Response.create(
          session.checkInId,
          session.questions.rotating.id,
          session.responses.rotating
        );
      }

      // Clear session
      activeCheckIns.delete(userId);

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *All done! Thanks for completing your weekly check-in.*'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Have a great rest of your week! 🐕'
            }
          }
        ]
      });

      console.log(`✓ Check-in completed for user ${userId}`);
    } catch (error) {
      console.error('Error saving check-in:', error);
      await say('Sorry, there was an error saving your responses. Please contact support.');
    }
  }
});

/**
 * Send reminder to a user
 */
async function sendReminder(slackUserId, reminderType = 'first') {
  try {
    const weekStartDate = getMonday();
    const user = await User.findBySlackUserId(slackUserId);

    if (!user) return;

    const checkIn = await CheckIn.findByUserAndWeek(user.id, weekStartDate);

    if (!checkIn || checkIn.completed_at) {
      return; // Already completed
    }

    await CheckIn.incrementRemindedCount(checkIn.id);

    const message = reminderType === 'final'
      ? {
          text: '⏰ Final reminder: Your weekly check-in is due today!',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '⏰ *Final Reminder*\n\nYour weekly pulse check-in is due today! It only takes 2 minutes.\n\nPlease complete it when you get a chance. 🐕'
              }
            }
          ]
        }
      : {
          text: '🔔 Friendly reminder: Your weekly check-in is waiting!',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '🔔 *Friendly Reminder*\n\nJust a quick reminder to complete your weekly pulse check-in if you haven\'t already!\n\nIt only takes a couple of minutes. 😊'
              }
            }
          ]
        };

    await app.client.chat.postMessage({
      channel: slackUserId,
      ...message
    });

    console.log(`✓ ${reminderType} reminder sent to ${slackUserId}`);
  } catch (error) {
    console.error(`Error sending reminder to ${slackUserId}:`, error);
  }
}

/**
 * Start the bot
 */
async function start() {
  try {
    await app.start();
    console.log('⚡ SupDawg Slack bot is running!');
  } catch (error) {
    console.error('Failed to start Slack bot:', error);
  }
}

module.exports = {
  app,
  start,
  sendCheckIn,
  sendReminder
};
