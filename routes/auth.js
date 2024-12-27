const express = require('express');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Render login page
router.get('/login', (req, res) => {
  const theme = req.cookies.theme || 'default';
  const cssLink = `<link rel="stylesheet" type="text/css" href="/themes/${theme}.css">`;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login</title>
      ${cssLink}
    </head>
    <body>
      <div class="login-container">
        <h1>Login</h1>
        <form action="/login" method="post">
          <input type="text" name="username" placeholder="Username" required>
          <input type="password" name="password" placeholder="Password" required>
          <button type="submit" class="button">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = req.app.locals.db;
  const user = await db.collection('Users').findOne({ username });

  //if (user && await bcrypt.compare(password, user.password)) { // Use this line if you have hashed passwords
  if (user && password == user.password) {
    req.session.userId = user._id.toString(); // Ensure userId is stored as a string
    req.session.role = user.role;
    res.redirect('/');
  } else {
    res.status(401).send('Invalid username or password');
  }
});

// Handle logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;