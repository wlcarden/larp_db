const express = require('express');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { requireLogin, requireRole } = require('../middleware/auth');
const router = express.Router();

// Middleware to check if the user is an admin
const requireAdmin = requireRole('admin');

// Render manage users page
router.get('/manage-users', requireLogin, requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const users = await db.collection('Users').find({}).toArray();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manage Users</title>
      ${res.locals.cssLink}
    </head>
    <body>
      <h1>Manage Users</h1>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr>
        ${users.map(user => `
          <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
              <a href="/edit-user/${user._id}">Edit</a>
              <a href="/delete-user/${user._id}" onclick="return confirm('Are you sure?')">Delete</a>
            </td>
          </tr>
        `).join('')}
      </table>
      <a href="/create-user"><button>Create New User</button></a>
      <br/><a href="/game-view">Back to Game View</a>
    </body>
    </html>`;

  res.send(html);
});

// Render create user page
router.get('/create-user', requireLogin, requireAdmin, (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Create User</title>
      ${res.locals.cssLink}
    </head>
    <body>
      <h1>Create User</h1>
      <form action="/create-user" method="post">
        <label for="username">Username:</label><input type="text" name="username" required><br>
        <label for="email">Email:</label><input type="email" name="email" required><br>
        <label for="password">Password:</label><input type="password" name="password" required><br>
        <label for="role">Role:</label>
        <select name="role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select><br>
        <button type="submit">Create User</button>
      </form>
      <br/><a href="/manage-users">Back to Manage Users</a>
    </body>
    </html>`;

  res.send(html);
});

// Handle create user
router.post('/create-user', requireLogin, requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  const db = req.app.locals.db;
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    username,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date()
  };

  await db.collection('Users').insertOne(newUser);
  res.redirect('/manage-users');
});

// Render edit user page
router.get('/edit-user/:id', requireLogin, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const db = req.app.locals.db;
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) });

  if (!user) {
    return res.status(404).send('User not found.');
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Edit User</title>
      ${res.locals.cssLink}
    </head>
    <body>
      <h1>Edit User</h1>
      <form action="/edit-user/${userId}" method="post">
        <label for="username">Username:</label><input type="text" name="username" value="${user.username}" required><br>
        <label for="email">Email:</label><input type="email" name="email" value="${user.email}" required><br>
        <label for="role">Role:</label>
        <select name="role">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select><br>
        <button type="submit">Save Changes</button>
      </form>
      <br/><a href="/manage-users">Back to Manage Users</a>
    </body>
    </html>`;

  res.send(html);
});

// Handle edit user
router.post('/edit-user/:id', requireLogin, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { username, email, role } = req.body;
  const db = req.app.locals.db;

  await db.collection('Users').updateOne({ _id: new ObjectId(userId) }, { $set: { username, email, role } });
  res.redirect('/manage-users');
});

// Handle delete user
router.get('/delete-user/:id', requireLogin, requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const db = req.app.locals.db;

  await db.collection('Users').deleteOne({ _id: new ObjectId(userId) });
  res.redirect('/manage-users');
});

module.exports = router;
