const moment = require('moment-timezone');

/**
 * Get the Monday of the current week
 */
function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0]; // Return YYYY-MM-DD
}

/**
 * Get the current day of the week in lowercase
 */
function getCurrentDayOfWeek() {
  return moment().format('dddd').toLowerCase();
}

/**
 * Check if current time matches the target time (within 5 minutes)
 */
function isTimeMatch(targetTime, timezone = 'America/New_York') {
  const now = moment().tz(timezone);
  const [hours, minutes] = targetTime.split(':').map(Number);
  const target = moment().tz(timezone).hours(hours).minutes(minutes);

  const diffMinutes = Math.abs(now.diff(target, 'minutes'));
  return diffMinutes <= 5; // Within 5-minute window
}

/**
 * Convert timezone-aware time to UTC cron expression
 */
function convertToCron(time, timezone = 'America/New_York') {
  const [hours, minutes] = time.split(':').map(Number);
  const localTime = moment().tz(timezone).hours(hours).minutes(minutes);
  const utcTime = localTime.utc();

  return `${utcTime.minutes()} ${utcTime.hours()} * * *`;
}

/**
 * Get current time in user's timezone
 */
function getCurrentTimeInTimezone(timezone) {
  return moment().tz(timezone).format('HH:mm');
}

/**
 * Check if it's a specific day of the week in a timezone
 */
function isDayInTimezone(dayName, timezone) {
  const currentDay = moment().tz(timezone).format('dddd').toLowerCase();
  return currentDay === dayName.toLowerCase();
}

module.exports = {
  getMonday,
  getCurrentDayOfWeek,
  isTimeMatch,
  convertToCron,
  getCurrentTimeInTimezone,
  isDayInTimezone
};
