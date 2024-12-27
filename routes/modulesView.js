const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

async function getUserDisplayNameById(userId, db) {
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });
  return user ? user.displayName : 'Unknown User';
}

router.get('/modules-view/:eventId', async (req, res) => {
  if (!req.app.locals.db) {
    console.error('Database not connected.');
    return res.status(500).send('Database not connected.');
  }
  const { eventId } = req.params;
  const theme = req.cookies.theme || 'default';
  try {
    const db = req.app.locals.db;
    const modulesCollection = db.collection('Modules');
    let modules = await modulesCollection.find({ eventId: new ObjectId(eventId) }).toArray();
    const event = await db.collection('Events').findOne({ _id: new ObjectId(eventId) });
    const eventName = event ? event.name : 'Unknown Event';

    // Pre-enrich each module with its authorName for easy use in the schedule
    for (const mod of modules) {
      mod.authorName = await getUserDisplayNameById(mod.writerId, db);
    }

    // Convert the schedule function to async so we can await inside it
    async function generateScheduleHTML(event, modules, db) {
      if (!event.startTime || !event.endTime) {
        return "<p>No event start/end time defined. Cannot display schedule.</p>";
      }

      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);

      // Number of days in this event (one column per day)
      const dayCount = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24)) + 1;

      // Consider a 24-hour block for each day
      const hoursInDay = [...Array(24).keys()];

      // Table header
      let scheduleHTML = `
        <div class="page-container">
        <center>
        <h1>${eventName}</h1>
        <h2>Module Schedule</h2>
        </center>
        <table border="1" cellpadding="5" cellspacing="0">
          <thead>
            <tr>
              <th>Hour</th>`;
      for (let d = 0; d < dayCount; d++) {
        const thisDay = new Date(eventStart.getTime());
        thisDay.setDate(eventStart.getDate() + d);
        scheduleHTML += `<th>${thisDay.toLocaleDateString()}</th>`;
      }
      scheduleHTML += `</tr></thead><tbody>`;

      // Check if a module is active at [year, month, day, hour]
      const isModuleActive = (mod, year, month, day, hour) => {
        const moduleStart = new Date(mod.startTime);
        const moduleEnd = new Date(moduleStart.getTime() + (mod.duration * 60 * 60 * 1000));
        const currentTime = new Date(year, month, day, hour);
        return currentTime >= moduleStart && currentTime < moduleEnd;
      };

      // Build rows for each hour
      for (const hour of hoursInDay) {
        scheduleHTML += `<tr><td>${hour}:00</td>`;
        for (let d = 0; d < dayCount; d++) {
          const thisDay = new Date(eventStart.getTime());
          thisDay.setDate(eventStart.getDate() + d);
          thisDay.setHours(hour, 0, 0, 0);

          // Grey out hours before event start or after event end
          let tdStyle = '';
          if (thisDay < eventStart || thisDay >= eventEnd) {
            tdStyle = 'background-color:darkgrey;';
          }

          // Collect active modules for this hour
          const activeModules = modules.filter(mod =>
            isModuleActive(mod, thisDay.getFullYear(), thisDay.getMonth(), thisDay.getDate(), hour)
          );

          if (activeModules.length > 0) {
            // Build list of module names and their authors
            const namesAndAuthors = activeModules.map(am => {
              const title = am.name || "Untitled";
              const author = am.authorName || "Unknown User";
              return `${title} (${author})`;
            }).join("<br/>");

            // Modified line 88 to include the author name
            scheduleHTML += `<td style="background-color:lightgreen;${tdStyle}">${namesAndAuthors}</td>`;
          } else {
            scheduleHTML += `<td style="${tdStyle}"></td>`;
          }
        }
        scheduleHTML += `</tr>`;
      }

      scheduleHTML += `</tbody></table></div>`;
      return scheduleHTML;
    }

    // Generate the schedule with author names
    const scheduleHtml = await generateScheduleHTML(event, modules, db);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${eventName} - Modules</title>
        ${res.locals.cssLink}
        <style>
          tr[data-href] {
            cursor: pointer;
          }
          tr[data-href]:hover {
            background-color: #f0f0f0;
          }
          th {
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        ${scheduleHtml}
        <hr>
        <div>
        <table border="1" cellpadding="5" cellspacing="0" id="modules-table">
          <thead>
            <tr>
              <th data-sort="name">Name</th>
              <th data-sort="author">Author</th>
              <th data-sort="summary">Summary</th>
              <th data-sort="startTime">Start Time</th>
              <th data-sort="duration">Duration (h)</th>
            </tr>
          </thead>
          <tbody>`;

    // Build the normal modules table
    for (const mod of modules) {
      const formatDate = (date) => {
        const options = {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        };
        return new Date(date).toLocaleString('en-US', options);
      };
      html += `
        <tr data-href="/module-properties-view/${mod._id}">
          <td>${mod.name || ''}</td>
          <td>${mod.authorName || ''}</td>
          <td>${mod.summary || ''}</td>
          <td>${mod.startTime ? formatDate(mod.startTime) : ''}</td>
          <td><center><b>${mod.duration || ''}</center></b></td>
        </tr>`;
    }

    const game = await db.collection('Games').findOne({ _id: new ObjectId(event.gameId) });
    const gameId = game ? game._id : 'unknown';

    html += `</tbody></table>
    <br/>
    </div>    
       <div><a href="/create-module/${eventId}"><button>Create New Module</button></a></div>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const rows = document.querySelectorAll('tr[data-href]');
          rows.forEach(row => {
            row.addEventListener('click', () => {
              window.location.href = row.dataset.href;
            });
          });

          const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
          const comparer = (idx, asc) => (a, b) => ((v1, v2) => 
            v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
          )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

          document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
            const table = th.closest('table');
            const tbody = table.querySelector('tbody');
            Array.from(tbody.querySelectorAll('tr'))
              .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
              .forEach(tr => tbody.appendChild(tr));
          })));
        });
      </script>
      </body>
      <footer>
      <hr>
      <a href="/events-view/${gameId}">Back to Events</a>
      </footer>
      </html>`;

    res.send(html);
  } catch (err) {
    console.error("Error fetching modules view data:", err);
    res.send("Error fetching modules view data.");
  }
});

module.exports = router;