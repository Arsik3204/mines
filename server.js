const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('database.db');


db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'секретный-ключ-замените-на-свой',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));


app.post('/register', async (req, res) => {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).send('Пароли не совпадают');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
        stmt.run(email, hashedPassword);
        res.redirect('/sign_in.html');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).send('Пользователь с таким email уже существует');
        }
        res.status(500).send('Ошибка сервера');
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
        return res.status(401).send('Неверный email или пароль');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).send('Неверный email или пароль');
    }

    req.session.userId = user.id;
    req.session.email = user.email;
    res.redirect('/profile.html');
});

app.get('/profile.html', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/sign_in.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    res.json({ email: req.session.email });
});


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('Сервер запущен: http://localhost:3000');
});

// node -e "const db = require('better-sqlite3')('database.db'); console.table(db.prepare('SELECT id, email, password FROM users').all());"