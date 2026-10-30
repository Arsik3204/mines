const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const db = new Database('database.db');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, display_name TEXT, avatar TEXT DEFAULT '');
  CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, artist TEXT);
  CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT);
  CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id INTEGER, track_id INTEGER, PRIMARY KEY(playlist_id, track_id));
  CREATE TABLE IF NOT EXISTS snippets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, text TEXT, audio_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
`);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: false, cookie: { secure: false } }));

app.post('/register', async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.status(400).send('Пароли не совпадают');
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const info = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(email, hashedPassword);
        req.session.userId = info.lastInsertRowid;
        res.redirect('/profile.html');
    } catch (err) { res.status(400).send('Email уже существует'); }
});

app.post('/login', async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email);
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).send('Неверный логин или пароль');
    req.session.userId = user.id;
    res.redirect('/profile.html');
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT id, email, display_name, avatar FROM users WHERE id = ?').get(req.session.userId);
    const tracks = db.prepare('SELECT * FROM tracks WHERE user_id = ?').all(req.session.userId);
    const playlists = db.prepare('SELECT * FROM playlists WHERE user_id = ?').all(req.session.userId);
    const snippets = db.prepare('SELECT * FROM snippets WHERE user_id = ? ORDER BY id DESC').all(req.session.userId);

    playlists.forEach(pl => {
        pl.tracks = db.prepare('SELECT t.* FROM tracks t JOIN playlist_tracks pt ON t.id = pt.track_id WHERE pt.playlist_id = ?').all(pl.id);
    });

    res.json({
        id: user.id, email: user.email, name: user.display_name || user.email.split('@')[0],
        avatar: user.avatar, tracks, playlists, snippets
    });
});

app.post('/api/profile', upload.single('avatar'), (req, res) => {
    let query = 'UPDATE users SET display_name = ?'; let params = [req.body.displayName];
    if (req.file) { query += ', avatar = ?'; params.push('/uploads/' + req.file.filename); }
    query += ' WHERE id = ?'; params.push(req.session.userId);
    db.prepare(query).run(...params);
    res.json({ success: true });
});

app.post('/api/tracks', (req, res) => {
    db.prepare('INSERT INTO tracks (user_id, title, artist) VALUES (?, ?, ?)').run(req.session.userId, req.body.title, req.body.artist || 'Unknown');
    res.json({ success: true });
});

app.post('/api/playlists', (req, res) => {
    db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)').run(req.session.userId, req.body.name);
    res.json({ success: true });
});

app.post('/api/playlists/add-track', (req, res) => {
    try {
        db.prepare('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)').run(req.body.playlistId, req.body.trackId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/snippets', upload.single('audio'), (req, res) => {
    const audioUrl = req.file ? '/uploads/' + req.file.filename : null;
    db.prepare('INSERT INTO snippets (user_id, text, audio_url) VALUES (?, ?, ?)').run(req.session.userId, req.body.text, audioUrl);
    res.json({ success: true });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.listen(3000, () => console.log('Сервер: http://localhost:3000'));