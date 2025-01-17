const { ObjectId } = require('mongodb');

// Function to format date
function formatDate(date, options = { month: 'long', day: 'numeric',  hour: '2-digit', minute: '2-digit', hour12: true }) {
  const dateObj = new Date(date);
  return dateObj.toLocaleString('en-US', options);
}

// Function to get user role
async function getUserRole(db, userId) {
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });
  return user ? user.role : 'user';
}

// Function to check if user is admin
function isAdmin(game, userId, userRole) {
  return (game.administrators && game.administrators.includes(userId)) || userRole === 'admin';
}

// Function to check if user is author
function isAuthor(module, userId) {
  return module.writerId.toString() === userId;
}

// Converts a UTC date to local date-time string for datetime-local input
function toLocalHTMLDatetime(utcDate) {
  const dateObj = new Date(utcDate);
  // Convert to local time
  const localDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0,16);
}

// Parses a local datetime string and converts it to UTC, considering timezone offset
function parseLocalDateTime(dateStr) {
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
}

module.exports = {
  formatDate,
  getUserRole,
  isAdmin,
  isAuthor,
  toLocalHTMLDatetime,
  parseLocalDateTime
};