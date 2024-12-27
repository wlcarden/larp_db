const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

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
    const modules = await modulesCollection.find({ eventId: new ObjectId(eventId) }).toArray();
    const event = await db.collection('Events').findOne({ _id: new ObjectId(eventId) });
    const eventName = event ? event.name : 'Unknown Event';
    
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
        <h1>${eventName} - Modules</h1>
        <a href="/create-module/${eventId}"><button>Create New Module</button></a>
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
    
    for (const module of modules) {
      const formatDate = (date) => {
        const options = { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
        return new Date(date).toLocaleString('en-US', options);
      };
      const author = await db.collection('Users').findOne({ _id: new ObjectId(module.writerId) });
      const authorName = author ? author.displayName : 'Unknown User';

      html += `<tr data-href="/module-properties-view/${module._id}">
        <td>${module.name || ''}</td>
        <td>${authorName || ''}</td>
        <td>${module.summary || ''}</td>
        <td>${module.startTime ? formatDate(module.startTime) : ''}</td>
        <td>${module.duration || ''}</td>
      </tr>`;
    }

    const game = await db.collection('Games').findOne({ _id: new ObjectId(event.gameId) });
    const gameId = game ? game._id : 'unknown';

    html += `</tbody></table><br/><a href="/events-view/${gameId}">Back to Events</a>
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
      </html>`;
    res.send(html);
  } catch (err) {
    console.error("Error fetching modules view data:", err);
    res.send("Error fetching modules view data.");
  }
});

module.exports = router;