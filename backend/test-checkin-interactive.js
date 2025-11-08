require('dotenv').config();
const { app, sendCheckIn } = require('./src/services/slackBot');

async function testCheckIn() {
  const userId = 'U5H5GLJLV';
  const workspaceId = 'default';

  console.log('Starting Slack bot...');

  // Start the bot first
  await app.start();
  console.log('✓ Bot started and listening');

  // Wait a moment for connection to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`\nSending test check-in to user ${userId}...`);

  try {
    const result = await sendCheckIn(userId, workspaceId);

    if (result.alreadyCompleted) {
      console.log('✓ User already completed check-in for this week');
      process.exit(0);
    } else if (result.success) {
      console.log('✓ Check-in sent successfully!');
      console.log('\n📱 Now check your Slack DMs and complete the check-in.');
      console.log('   This script will keep running to handle your responses.');
      console.log('   Press Ctrl+C when done.\n');
    }

  } catch (error) {
    console.error('✗ Error sending check-in:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n✓ Test complete. Exiting...');
  process.exit(0);
});

testCheckIn();
