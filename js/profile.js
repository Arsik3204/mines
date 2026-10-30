"use strict";

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let width, height, stars = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        stars = Array.from({ length: Math.floor((width * height) / 8000) }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.7 + 0.3,
            speed: Math.random() * 0.15 + 0.02,
            twinkle: Math.random() * 0.02 + 0.005
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => {
            s.alpha += s.twinkle;
            if (s.alpha > 1 || s.alpha < 0.2) s.twinkle = -s.twinkle;
            s.y += s.speed;
            if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();

    let profileData = { tracks: [], playlists: [], snippets: [] };
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    const tracksContainer = document.getElementById('tracksContainer');
    const playlistsContainer = document.getElementById('playlistsContainer');
    const snippetsContainer = document.getElementById('snippetsContainer');

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        };
    });

    function loadProfile() {
        fetch('/api/me')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(data => {
                profileData = data;
                document.getElementById('username').textContent = data.name;
                document.getElementById('userEmail').textContent = data.email;
                document.getElementById('avatar').textContent = data.avatar ? '' : data.name.charAt(0).toUpperCase();
                document.getElementById('avatar').style.backgroundImage = data.avatar ? `url('${data.avatar}')` : 'none';
                document.getElementById('trackCount').textContent = data.tracks.length;
                document.getElementById('playlistCount').textContent = data.playlists.length;
                document.getElementById('snippetCount').textContent = data.snippets.length;
                document.getElementById('editName').value = data.name;
                renderTracks(data.tracks);
                renderPlaylists(data.playlists);
                renderSnippets(data.snippets);
            })
            .catch(() => window.location.href = '/sign_in.html');
    }

    function renderTracks(tracks) {
        tracksContainer.innerHTML = tracks.length ? '' : '<p class="empty-state">No tracks yet.</p>';
        tracks.forEach(t => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `<div class="list-item-cover">♪</div><div class="list-item-info"><div class="list-item-title">${t.title}</div><div class="list-item-sub">${t.artist}</div></div>`;
            tracksContainer.appendChild(el);
        });
    }

    function renderPlaylists(playlists) {
        playlistsContainer.innerHTML = playlists.length ? '' : '<p class="empty-state">No playlists yet.</p>';
        playlists.forEach(pl => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'flex-start';
            let tracksHtml = pl.tracks.length
                ? pl.tracks.map(t => `<div style="font-size:13px; color:#aaa; margin-top:5px;">• ${t.title} - ${t.artist}</div>`).join('')
                : '<div style="font-size:13px; color:#666; margin-top:5px; font-style:italic;">Empty playlist</div>';
            let options = profileData.tracks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
            let selectHtml = profileData.tracks.length > 0
                ? `<div style="display:flex; gap:10px; margin-top:10px; width:100%;"><select id="select-track-${pl.id}" class="form-input" style="padding: 5px 10px; font-size:13px;">${options}</select><button class="secondary-btn" onclick="addTrackToPlaylist(${pl.id})">Add to Playlist</button></div>`
                : '';
            el.innerHTML = `<div class="list-item-cover" style="margin-bottom:10px;">📁</div><div class="list-item-info"><div class="list-item-title">${pl.name}</div></div>${tracksHtml}${selectHtml}`;
            playlistsContainer.appendChild(el);
        });
    }

    function renderSnippets(snippets) {
        snippetsContainer.innerHTML = snippets.length ? '' : '<p class="empty-state">No snippets yet. Share your first thought!</p>';
        snippets.forEach(s => {
            const el = document.createElement('div');
            el.className = 'snippet-card';
            let audioHtml = s.audio_url ? `<audio controls src="${s.audio_url}" class="snippet-audio"></audio>` : '';
            el.innerHTML = `<div class="snippet-text">${s.text}</div>${audioHtml}<div class="snippet-date">${new Date(s.created_at).toLocaleString()}</div>`;
            snippetsContainer.appendChild(el);
        });
    }

    document.getElementById('addTrackBtn').onclick = () => {
        const title = document.getElementById('newTrackTitle').value;
        if (!title) return;
        fetch('/api/tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, artist: document.getElementById('newTrackArtist').value })
        }).then(() => loadProfile());
    };

    document.getElementById('addPlaylistBtn').onclick = () => {
        const name = document.getElementById('newPlaylistName').value;
        if (!name) return;
        fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }).then(() => loadProfile());
    };

    window.addTrackToPlaylist = (playlistId) => {
        const trackId = document.getElementById(`select-track-${playlistId}`).value;
        fetch('/api/playlists/add-track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistId, trackId })
        }).then(() => loadProfile());
    };

    document.getElementById('addSnippetBtn').onclick = () => {
        const text = document.getElementById('newSnippetText').value;
        const fileInput = document.getElementById('newSnippetAudio');
        const formData = new FormData();
        formData.append('text', text);
        if (fileInput.files[0]) formData.append('audio', fileInput.files[0]);
        fetch('/api/snippets', { method: 'POST', body: formData })
            .then(() => {
                loadProfile();
                document.getElementById('newSnippetText').value = '';
                fileInput.value = '';
            });
    };

    document.getElementById('editProfileForm').onsubmit = function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        fetch('/api/profile', { method: 'POST', body: formData })
            .then(() => {
                document.getElementById('editModal').classList.remove('active');
                loadProfile();
            });
    };

    document.getElementById('openEditModalBtn').onclick = () => document.getElementById('editModal').classList.add('active');
    document.getElementById('closeEditModalBtn').onclick = () => document.getElementById('editModal').classList.remove('active');

    loadProfile();
});