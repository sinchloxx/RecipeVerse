// server/index.js - Main backend server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173', credentials: true } });

// Database setup
const userFile = new JSONFile('db/users.json');
const postFile = new JSONFile('db/posts.json');
const messageFile = new JSONFile('db/messages.json');
const notificationFile = new JSONFile('db/notifications.json');
const followFile = new JSONFile('db/follows.json');
const savedFile = new JSONFile('db/saved.json');

const userDB = new Low(userFile, { users: [] });
const postDB = new Low(postFile, { posts: [] });
const messageDB = new Low(messageFile, { messages: [] });
const notificationDB = new Low(notificationFile, { notifications: [] });
const followDB = new Low(followFile, { follows: [] });
const savedDB = new Low(savedFile, { saved: [] });

// Load 500+ recipes
const recipes = require('./recipes.json');

// Initialize databases
async function initDB() {
  await userDB.read(); userDB.data ||= { users: [] };
  await postDB.read(); postDB.data ||= { posts: [] };
  await messageDB.read(); messageDB.data ||= { messages: [] };
  await notificationDB.read(); notificationDB.data ||= { notifications: [] };
  await followDB.read(); followDB.data ||= { follows: [] };
  await savedDB.read(); savedDB.data ||= { saved: [] };
  await userDB.write(); await postDB.write(); await messageDB.write();
  await notificationDB.write(); await followDB.write(); await savedDB.write();
}
initDB();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'recipeverse_secret_key_2025';

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', limiter);

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  const existing = userDB.data.users.find(u => u.email === email || u.username === username);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, email, password: hashed, pfp: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150', bio: '', createdAt: new Date() };
  userDB.data.users.push(user);
  await userDB.write();
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username, email, pfp: user.pfp, bio: user.bio } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const user = userDB.data.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
  const expiresIn = rememberMe ? '30d' : '7d';
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, pfp: user.pfp, bio: user.bio } });
});

// User routes
app.get('/api/users/:id', authenticate, async (req, res) => {
  const user = userDB.data.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const followers = followDB.data.follows.filter(f => f.followingId === user.id).length;
  const following = followDB.data.follows.filter(f => f.followerId === user.id).length;
  const posts = postDB.data.posts.filter(p => p.userId === user.id);
  const isFollowing = followDB.data.follows.some(f => f.followerId === req.userId && f.followingId === user.id);
  res.json({ ...user, password: undefined, followers, following, posts, isFollowing });
});

app.put('/api/users/profile', authenticate, upload.single('pfp'), async (req, res) => {
  const user = userDB.data.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.body.username) user.username = req.body.username;
  if (req.body.bio) user.bio = req.body.bio;
  if (req.file) user.pfp = `/uploads/${req.file.filename}`;
  await userDB.write();
  res.json({ id: user.id, username: user.username, email: user.email, pfp: user.pfp, bio: user.bio });
});

app.post('/api/users/follow', authenticate, async (req, res) => {
  const { followingId } = req.body;
  if (req.userId === followingId) return res.status(400).json({ error: 'Cannot follow self' });
  const exists = followDB.data.follows.some(f => f.followerId === req.userId && f.followingId === followingId);
  if (!exists) {
    followDB.data.follows.push({ id: uuidv4(), followerId: req.userId, followingId, createdAt: new Date() });
    await followDB.write();
    // Create notification
    notificationDB.data.notifications.push({ id: uuidv4(), userId: followingId, type: 'follow', fromId: req.userId, read: false, createdAt: new Date() });
    await notificationDB.write();
    io.to(followingId).emit('new_notification', { type: 'follow', fromId: req.userId });
  }
  res.json({ success: true });
});

app.post('/api/users/unfollow', authenticate, async (req, res) => {
  const { followingId } = req.body;
  const index = followDB.data.follows.findIndex(f => f.followerId === req.userId && f.followingId === followingId);
  if (index !== -1) {
    followDB.data.follows.splice(index, 1);
    await followDB.write();
  }
  res.json({ success: true });
});

// Recipe routes
app.get('/api/recipes', authenticate, async (req, res) => {
  const { category, difficulty, search } = req.query;
  let filtered = [...recipes];
  if (category) filtered = filtered.filter(r => r.category === category);
  if (difficulty) filtered = filtered.filter(r => r.difficulty === difficulty);
  if (search) filtered = filtered.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.ingredients.some(i => i.toLowerCase().includes(search.toLowerCase())));
  res.json(filtered.slice(0, 50));
});

app.get('/api/recipes/:id', authenticate, (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

// Post routes
app.post('/api/posts', authenticate, upload.single('media'), async (req, res) => {
  const { caption, tags, recipeId } = req.body;
  let mediaUrl = null;
  if (req.file) mediaUrl = `/uploads/${req.file.filename}`;
  const post = { id: uuidv4(), userId: req.userId, caption, tags: tags ? tags.split(',') : [], recipeId, mediaUrl, likes: [], comments: [], createdAt: new Date() };
  postDB.data.posts.push(post);
  await postDB.write();
  res.json(post);
});

app.get('/api/posts', authenticate, async (req, res) => {
  const posts = postDB.data.posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const postsWithUsers = posts.map(post => {
    const user = userDB.data.users.find(u => u.id === post.userId);
    return { ...post, user: { id: user.id, username: user.username, pfp: user.pfp } };
  });
  res.json(postsWithUsers);
});

app.post('/api/posts/:id/like', authenticate, async (req, res) => {
  const post = postDB.data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const liked = post.likes.includes(req.userId);
  if (liked) post.likes = post.likes.filter(id => id !== req.userId);
  else post.likes.push(req.userId);
  await postDB.write();
  if (!liked && post.userId !== req.userId) {
    notificationDB.data.notifications.push({ id: uuidv4(), userId: post.userId, type: 'like', fromId: req.userId, postId: post.id, read: false, createdAt: new Date() });
    await notificationDB.write();
    io.to(post.userId).emit('new_notification', { type: 'like', fromId: req.userId, postId: post.id });
  }
  res.json({ likes: post.likes.length, liked: !liked });
});

app.post('/api/posts/:id/comment', authenticate, async (req, res) => {
  const post = postDB.data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const comment = { id: uuidv4(), userId: req.userId, text: req.body.text, createdAt: new Date() };
  post.comments.push(comment);
  await postDB.write();
  if (post.userId !== req.userId) {
    notificationDB.data.notifications.push({ id: uuidv4(), userId: post.userId, type: 'comment', fromId: req.userId, postId: post.id, read: false, createdAt: new Date() });
    await notificationDB.write();
    io.to(post.userId).emit('new_notification', { type: 'comment', fromId: req.userId, postId: post.id });
  }
  res.json(comment);
});

// Saved recipes
app.post('/api/saved', authenticate, async (req, res) => {
  const { recipeId } = req.body;
  const exists = savedDB.data.saved.some(s => s.userId === req.userId && s.recipeId === recipeId);
  if (!exists) {
    savedDB.data.saved.push({ id: uuidv4(), userId: req.userId, recipeId, createdAt: new Date() });
    await savedDB.write();
  }
  res.json({ success: true });
});

app.delete('/api/saved/:recipeId', authenticate, async (req, res) => {
  const index = savedDB.data.saved.findIndex(s => s.userId === req.userId && s.recipeId === req.params.recipeId);
  if (index !== -1) {
    savedDB.data.saved.splice(index, 1);
    await savedDB.write();
  }
  res.json({ success: true });
});

app.get('/api/saved', authenticate, async (req, res) => {
  const saved = savedDB.data.saved.filter(s => s.userId === req.userId);
  const savedRecipes = saved.map(s => recipes.find(r => r.id === s.recipeId)).filter(r => r);
  res.json(savedRecipes);
});

// Notifications
app.get('/api/notifications', authenticate, async (req, res) => {
  const notifs = notificationDB.data.notifications.filter(n => n.userId === req.userId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  const notifsWithFrom = notifs.map(n => {
    const fromUser = userDB.data.users.find(u => u.id === n.fromId);
    return { ...n, fromUser: fromUser ? { id: fromUser.id, username: fromUser.username, pfp: fromUser.pfp } : null };
  });
  res.json(notifsWithFrom);
});

app.put('/api/notifications/read', authenticate, async (req, res) => {
  notificationDB.data.notifications.forEach(n => { if (n.userId === req.userId) n.read = true; });
  await notificationDB.write();
  res.json({ success: true });
});

// AI Kitchen endpoint
app.post('/api/ai/assistant', authenticate, async (req, res) => {
  const { query } = req.body;
  const lowerQuery = query.toLowerCase();
  // Search in recipe database
  let matched = recipes.filter(r => r.title.toLowerCase().includes(lowerQuery) || r.ingredients.some(i => i.toLowerCase().includes(lowerQuery)));
  if (matched.length === 0 && (lowerQuery.includes('egg') || lowerQuery.includes('rice'))) {
    matched = recipes.filter(r => r.ingredients.some(i => i.includes('egg') || i.includes('rice')));
  }
  if (matched.length > 0) {
    const recipe = matched[0];
    const variations = generateVariations(recipe);
    res.json({ type: 'existing', recipe, variations });
  } else {
    // Generate new recipe dynamically
    const newRecipe = generateDynamicRecipe(query);
    res.json({ type: 'generated', recipe: newRecipe, variations: generateVariations(newRecipe) });
  }
});

function generateVariations(recipe) {
  const base = { name: 'Classic', ingredients: [...recipe.ingredients], instructions: [...recipe.instructions] };
  const spicy = { name: 'Spicy', ingredients: [...recipe.ingredients, '1 tsp chili flakes', '1/2 tsp cayenne'], instructions: [...recipe.instructions, 'Add chili flakes and cayenne for heat.'] };
  const vegan = recipe.tags?.includes('vegan') ? null : { name: 'Vegan', ingredients: recipe.ingredients.map(i => i.replace('chicken', 'tofu').replace('cheese', 'nutritional yeast').replace('cream', 'coconut cream')), instructions: [...recipe.instructions, 'Use plant-based alternatives.'] };
  const quick = { name: 'Quick (30min)', ingredients: [...recipe.ingredients], instructions: ['Prep all ingredients first.', 'Cook on high heat for faster results.', ...recipe.instructions.slice(0, -1)] };
  return [base, spicy, vegan, quick].filter(v => v);
}

function generateDynamicRecipe(query) {
  const words = query.split(' ');
  const mainIngredient = words.find(w => ['chicken','beef','pasta','rice','egg','potato','tomato'].includes(w)) || 'vegetables';
  return {
    id: uuidv4(),
    title: `Custom ${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)} Delight`,
    ingredients: [`2 cups ${mainIngredient}`, '1 onion', '2 garlic cloves', '1 tbsp olive oil', 'Salt and pepper'],
    instructions: ['Chop ingredients.', 'Sauté onion and garlic.', `Add ${mainIngredient} and cook until tender.`, 'Season to taste.'],
    category: 'dinner',
    cookTime: '25 min',
    difficulty: 'Easy',
    tags: ['quick', 'custom'],
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'
  };
}

// Messages
app.get('/api/messages/:userId', authenticate, async (req, res) => {
  const messages = messageDB.data.messages.filter(m => (m.fromId === req.userId && m.toId === req.params.userId) || (m.fromId === req.params.userId && m.toId === req.userId));
  res.json(messages);
});

// Search
app.get('/api/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ recipes: [], users: [], posts: [] });
  const matchedRecipes = recipes.filter(r => r.title.toLowerCase().includes(q.toLowerCase()));
  const matchedUsers = userDB.data.users.filter(u => u.username.toLowerCase().includes(q.toLowerCase()) && u.id !== req.userId);
  const matchedPosts = postDB.data.posts.filter(p => p.caption.toLowerCase().includes(q.toLowerCase()));
  res.json({ recipes: matchedRecipes.slice(0, 10), users: matchedUsers.slice(0, 10), posts: matchedPosts.slice(0, 10) });
});

// Socket.io for real-time
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  socket.join(socket.userId);
  
  socket.on('send_message', async (data) => {
    const message = { id: uuidv4(), fromId: socket.userId, toId: data.toId, text: data.text, image: data.image, recipe: data.recipe, timestamp: new Date() };
    messageDB.data.messages.push(message);
    await messageDB.write();
    io.to(data.toId).emit('receive_message', message);
    // Notification
    notificationDB.data.notifications.push({ id: uuidv4(), userId: data.toId, type: 'message', fromId: socket.userId, read: false, createdAt: new Date() });
    await notificationDB.write();
    io.to(data.toId).emit('new_notification', { type: 'message', fromId: socket.userId });
  });
  
  socket.on('call_user', ({ toId, signal }) => {
    io.to(toId).emit('incoming_call', { fromId: socket.userId, signal });
  });
  
  socket.on('answer_call', ({ toId, signal }) => {
    io.to(toId).emit('call_answered', { signal });
  });
  
  socket.on('end_call', ({ toId }) => {
    io.to(toId).emit('call_ended');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));