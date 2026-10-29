"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("starfield");
    const context = canvas.getContext("2d");

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const stars = [];
    const numStars = 150;

    class Star {
        constructor() {
            this.reset();
            this.y = Math.random() * window.innerHeight;
        }

        reset() {
            this.x = Math.random() * window.innerWidth;
            this.y = -20;
            this.size = Math.random() * 1.6 + 0.4;
            this.speed = Math.random() * 0.5 + 0.15;
            this.opacity = Math.random() * 0.6 + 0.4;
            this.twinkleSpeed = Math.random() * 0.015 + 0.005;
            this.baseOpacity = this.opacity;
        }

        update() {
            this.y += this.speed;
            this.opacity += this.twinkleSpeed;

            if (this.opacity >= 1 || this.opacity <= this.baseOpacity * 0.4) {
                this.twinkleSpeed *= -1;
            }

            if (this.y > window.innerHeight + 20) {
                this.reset();
            }
        }

        draw() {
            const { x, y, size, opacity } = this;

            if (size > 1.2) {
                const glow = context.createRadialGradient(x, y, 0, x, y, size * 6);
                glow.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                glow.addColorStop(0.3, `rgba(255, 255, 255, ${opacity * 0.35})`);
                glow.addColorStop(1, "rgba(255, 255, 255, 0)");
                context.fillStyle = glow;
                context.beginPath();
                context.arc(x, y, size * 6, 0, Math.PI * 2);
                context.fill();
            }

            context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();

            if (size > 1.3) {
                const ray = size * 4;
                context.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.55})`;
                context.lineWidth = 0.6;
                context.beginPath();
                context.moveTo(x - ray, y);
                context.lineTo(x + ray, y);
                context.moveTo(x, y - ray);
                context.lineTo(x, y + ray);
                context.stroke();
            }
        }
    }

    for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
    }

    function animate() {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);

        stars.forEach(star => {
            star.update();
            star.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();
});

const music = document.getElementById("music");
const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", function () {
    if (music.paused) {
        music.play().catch(error => {
            console.log(error);
        });
        playBtn.textContent = "⏸";
        playBtn.style.fontSize = "24px";
    } else {
        music.pause();
        playBtn.textContent = "▶";
    }
})