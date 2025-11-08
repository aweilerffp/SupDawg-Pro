require('dotenv').config();
const { sendCheckIn } = require('./src/services/slackBot');

async function testCheckIn() {
  const userId = 'U5H5GLJLV';
  const workspaceId = 'default';

  console.log(`Sending test check-in to user ${userId}...`);

  try {
    const result = await sendCheckIn(userId, workspaceId);

    if (result.alreadyCompleted) {
      console.log('✓ User already completed check-in for this week');
    } else if (result.success) {
      console.log('✓ Check-in sent successfully!');
      console.log('  Check your Slack DMs from SupDawg');
    }

    // Keep the process alive for a few seconds to ensure connection stays open
    setTimeout(() => {
      console.log('✓ Test complete');
      process.exit(0);
    }, 3000);

  } catch (error) {
    console.error('✗ Error sending check-in:', error.message);
    process.exit(1);
  }
}

testCheckIn();
