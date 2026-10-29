"use strict";
(function () {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createStars();
    }

    function createStars() {
        stars = [];
        const count = Math.floor((width * height) / 8000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.4 + 0.3,
                alpha: Math.random() * 0.7 + 0.3,
                speed: Math.random() * 0.15 + 0.02,
                twinkle: Math.random() * 0.02 + 0.005
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        for (const s of stars) {
            s.alpha += s.twinkle;
            if (s.alpha > 1 || s.alpha < 0.2) {
                s.twinkle = -s.twinkle;
            }
            s.y += s.speed;
            if (s.y > height) {
                s.y = 0;
                s.x = Math.random() * width;
            }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();


    const form = document.getElementById('loginForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const errorMsg = document.getElementById('errorMsg');

    function validatePasswords() {
        if (confirmPassword.value === "") {
            confirmPassword.classList.remove('input-error');
            errorMsg.classList.remove('visible');
            return true;
        }

        if (password.value !== confirmPassword.value) {
            confirmPassword.classList.add('input-error');
            errorMsg.classList.add('visible');
            return false;
        } else {
            confirmPassword.classList.remove('input-error');
            errorMsg.classList.remove('visible');
            return true;
        }
    }

    confirmPassword.addEventListener('input', validatePasswords);
    password.addEventListener('input', validatePasswords);

    form.addEventListener('submit', function (e) {
        if (!validatePasswords()) {
            e.preventDefault();
        }
    });
})();