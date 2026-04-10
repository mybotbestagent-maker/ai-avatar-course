const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const router = express.Router();

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'goldHands_jwt_secret_2026', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login route
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'dispatcher' && password === 'goldHands2026') {
        const token = jwt.sign({ username: username }, 'goldHands_jwt_secret_2026', { expiresIn: '1h' });
        return res.json({ token });
    }
    return res.status(401).json({ message: 'Invalid username or password' });
});

module.exports = { router, authenticateToken };