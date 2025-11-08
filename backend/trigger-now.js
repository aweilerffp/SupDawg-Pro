require('dotenv').config();
const { sendCheckIn } = require('./src/services/slackBot');

async function trigger() {
  console.log('Triggering check-in for U5H5GLJLV...');

  // Wait a moment to ensure the main bot is connected
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const result = await sendCheckIn('U5H5GLJLV', 'default');
    console.log('✓ Check-in sent!', result);
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

trigger();
