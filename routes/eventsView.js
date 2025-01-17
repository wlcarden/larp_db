//Displays the recent and upcoming events for a given game.

const express = require('express');
const { ObjectId } = require('mongodb');
const { formatDate } = require('../utils/helpers');
const { toLocalHTMLDatetime } = require('../utils/helpers');
const { getUserRole, isAdmin } = require('../utils/helpers');

const router = express.Router();

// Helper function to find all valid days of events for a given month
// Returns a Set of date strings like "YYYY-M-D"
function getEventDaysForMonth(events, year, month) {
  const eventDays = new Set();
  for (const event of events) {
    if (!event.startTime || !event.endTime) continue;

    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    // We only care about dates that fall within [year, month]
    // Create a temporary date, initialize to event start, and roll forward until end
    let tmp = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    while (tmp <= endDate) {
      // Check if tmp matches our year/month
      if (tmp.getFullYear() === year && tmp.getMonth() === month) {
        const dateString = `${tmp.getFullYear()}-${tmp.getMonth()}-${tmp.getDate()}`;
        eventDays.add(dateString);
      }
      tmp.setDate(tmp.getDate() + 1);
    }
  }
  return eventDays;
}

// Helper function to generate a calendar for a given year and month,
// highlighting the present day, past days, and days that have events.
function generateCalendarHTML(year, month, eventDays) {
  const monthName = new Date(year, month).toLocaleString('en-us', { month: 'long' });
  let calendarHTML = `<h3>${monthName} ${year}</h3>`;
  calendarHTML += `
    <table border="1" cellpadding="3" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <th>Sun</th>
        <th>Mon</th>
        <th>Tue</th>
        <th>Wed</th>
        <th>Thu</th>
        <th>Fri</th>
        <th>Sat</th>
      </tr>
      <tr>`;

  const firstDay = new Date(year, month, 1).getDay();
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<td></td>';
  }

  const today = new Date();
  const todayString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const currentWeekday = new Date(year, month, day).getDay();
    const dateString = `${year}-${month}-${day}`;

    let tdStyle = '';

    // If this date has passed, gray it out
    const currentDateObj = new Date(year, month, day);
    if (currentDateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      tdStyle = 'color:#999;';
    }

    // If this is the current day, override with highlight
    if (dateString === todayString) {
      tdStyle = 'background-color:yellow;font-weight:bold;';
    }

    // If it is an event day, highlight with a different color unless it's the present day
    if (eventDays.has(dateString) && dateString !== todayString) {
      tdStyle = `background-color:lightgreen;${tdStyle}`;
    }

    calendarHTML += `<td style="${tdStyle}">${day}</td>`;

    if (currentWeekday === 6 && day < daysInMonth) {
      calendarHTML += '</tr><tr>';
    }
  }

  calendarHTML += '</tr></table>';
  return calendarHTML;
}

router.get('/events-view/:gameId', async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const { gameId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const userId = req.session.userId;
    const db = req.app.locals.db;
    const game = await db.collection('Games').findOne({ _id: new ObjectId(gameId) });
    const gameName = game ? game.name : 'Unknown Game';
    const events = await db.collection('Events').find({ gameId: new ObjectId(gameId) }).toArray();
    const userRole = await getUserRole(db, userId);

    const userIsAdmin = isAdmin(game, userId, userRole);
    // We'll generate two calendars: current month, and next month
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Compute event days for both months
    const eventDaysCurrent = getEventDaysForMonth(events, currentYear, currentMonth);
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear = (currentMonth === 11) ? currentYear + 1 : currentYear;
    const eventDaysNext = getEventDaysForMonth(events, nextMonthYear, nextMonth);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${gameName} - Events</title>
        ${res.locals.cssLink}
        <style>
          tr[data-href] {
            cursor: pointer;
          }
          tr[data-href]:hover {
            background-color: #f0f0f0;
          }
        </style>        
        <div><h1>${gameName} - Events</h1></div>
      </head>
      <body>
        <!-- Calendar Widgets -->
        <div><center>
        <table border="0" cellpadding="0" cellspacing="50">
          <tr>
          <td><center>${generateCalendarHTML(currentYear, currentMonth, eventDaysCurrent)}</center></td>
          <td><center>${generateCalendarHTML(nextMonthYear, nextMonth, eventDaysNext)}</center></td>
        </center></div>

        <div><table border="1" cellpadding="5" cellspacing="0">
          <tr>
            <th>Event Name</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Description</th>
            <th>Modules</th>
          </tr>`;

    for (const event of events) {
      const moduleCount = await db.collection('Modules').countDocuments({ eventId: event._id });
      html += `
      <tr data-href="/modules-view/${event._id}">
        <td>${event.name || ''}</td>
        <td>${event.startTime ? formatDate(event.startTime) : ''}</td>
        <td>${event.endTime ? formatDate(event.endTime) : ''}</td>
        <td>${event.description || ''}</td>
        <td><center><b>${moduleCount}</center></b></td>`;        
      if (userIsAdmin) {
        html += `<td><a href="/edit-event/${event._id}"><button>Edit</button></a></td>`;
      }   
      html += `</tr>`;   
    }
    html += `</table></div>`;

    html += `
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const rows = document.querySelectorAll('tr[data-href]');
          rows.forEach(row => {
            row.addEventListener('click', () => {
              window.location.href = row.dataset.href;
            });
          });
        });
      </script>
      </body>
      <footer>
      <div><a href="/game-view">Back to Games</a></div>
      </footer>
      </html>`;

    res.send(html);
  } catch (err) {
    console.error("Error fetching events view data:", err);
    res.send("Error fetching events view data.");
  }
});

module.exports = router;