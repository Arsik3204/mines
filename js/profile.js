"use strict";

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('starfield'), ctx = canvas.getContext('2d');
    let width, height, stars = [];

    const resize = () => {
        width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight;
        stars = Array.from({length: Math.floor((width * height) / 8000)}, () => ({
            x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.7 + 0.3, speed: Math.random() * 0.15 + 0.02, twinkle: Math.random() * 0.02 + 0.005
        }));
    };

    const draw = () => {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => {
            s.alpha += s.twinkle; if (s.alpha > 1 || s.alpha < 0.2) s.twinkle = -s.twinkle;
            s.y += s.speed; if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
            ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${s.alpha})`; ctx.fill();
        });
        requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize); resize(); draw();

    let profileData = { tracks: [], playlists: [], snippets: [] };
    let currentPlaylist = [], currentTrackIndex = 0;

    const audio = document.getElementById('mainAudio'), player = document.getElementById('musicPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn'), progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime'), durationEl = document.getElementById('duration');
    const playerTitle = document.getElementById('playerTitle'), playerArtist = document.getElementById('playerArtist');
    const playerCover = document.getElementById('playerCover'), closePlayerBtn = document.getElementById('closePlayerBtn');

    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active'); document.getElementById(tab.dataset.target).classList.add('active');
        };
    });

    const loadProfile = () => {
        fetch('/api/me').then(res => { if (!res.ok) throw new Error(); return res.json(); }).then(data => {
            profileData = data;
            document.getElementById('username').textContent = data.name;
            document.getElementById('userEmail').textContent = data.email;
            document.getElementById('avatar').textContent = data.avatar ? '' : data.name.charAt(0).toUpperCase();
            document.getElementById('avatar').style.backgroundImage = data.avatar ? `url('${data.avatar}')` : 'none';
            document.getElementById('trackCount').textContent = data.tracks.length;
            document.getElementById('playlistCount').textContent = data.playlists.length;
            document.getElementById('snippetCount').textContent = data.snippets.length;
            document.getElementById('editName').value = data.name;
            renderTracks(data.tracks); renderPlaylists(data.playlists); renderSnippets(data.snippets);
        }).catch(() => window.location.href = '/sign_in.html');
    };

    const renderTracks = (tracks) => {
        const container = document.getElementById('tracksContainer');
        container.innerHTML = tracks.length ? '' : '<p class="empty-state">No tracks yet.</p>';
        tracks.forEach((t, index) => {
            const el = document.createElement('div'); el.className = 'list-item';
            const coverStyle = t.cover_url ? `background-image: url('${t.cover_url}'); background-size: cover;` : '';
            el.innerHTML = `<div class="list-item-cover" style="${coverStyle}">${t.cover_url ? '' : '♪'}</div>
        <div class="list-item-info" onclick="playTrack(${index})" style="cursor:pointer;">
          <div class="list-item-title">${t.title}</div><div class="list-item-sub">${t.artist}</div>
        </div><button class="delete-btn" onclick="deleteTrack(${t.id})">&times;</button>`;
            container.appendChild(el);
        });
    };


    const renderPlaylists = (playlists) => {
        const container = document.getElementById('playlistsContainer');
        container.innerHTML = playlists.length ? '' : '<p class="empty-state">No playlists yet.</p>';

        playlists.forEach(pl => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'flex-start';

            const tracksHtml = pl.tracks.length
                ? pl.tracks.map(t => `<div style="font-size:13px; color:#aaa; margin-top:5px;">• ${t.title} - ${t.artist}</div>`).join('')
                : '<div style="font-size:13px; color:#666; margin-top:5px; font-style:italic;">Empty playlist</div>';


            const options = profileData.tracks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
            const selectHtml = profileData.tracks.length > 0 ? `
        <div style="display:flex; gap:10px; margin-top:10px; width:100%;">
          <select id="select-track-${pl.id}" class="form-input" style="padding: 5px 10px; font-size:13px;">${options}</select>
          <button class="secondary-btn" onclick="addTrackToPlaylist(${pl.id})">Add existing</button>
        </div>` : '';


            const uploadHtml = `
        <div style="display:flex; gap:10px; margin-top:10px; width:100%; align-items: center;">
          <input type="file" id="upload-pl-${pl.id}" accept="audio/*" class="file-input" style="font-size: 12px; flex: 1;">
          <button class="secondary-btn" onclick="uploadToPlaylist(${pl.id})">Upload file</button>
        </div>
      `;

            el.innerHTML = `<div class="list-item-cover" style="margin-bottom:10px;">📁</div><div class="list-item-info"><div class="list-item-title">${pl.name}</div></div>${tracksHtml}${selectHtml}${uploadHtml}`;
            container.appendChild(el);
        });
    };

    const renderSnippets = (snippets) => {
        const container = document.getElementById('snippetsContainer');
        container.innerHTML = snippets.length ? '' : '<p class="empty-state">No snippets yet.</p>';

        snippets.forEach((s, index) => {
            const el = document.createElement('div'); el.className = 'snippet-card';
            el.style.position = 'relative';

            const audioHtml = s.audio_url ? `
        <div class="custom-snippet-player">
          <button class="snippet-play-btn" onclick="toggleSnippet(${index})" id="snippet-btn-${index}">▶</button>
          <div class="snippet-progress-wrap">
            <div class="snippet-progress-bar" id="snippet-progress-${index}"></div>
          </div>
          <span class="snippet-time" id="snippet-time-${index}">0:00</span>
          <audio id="snippet-audio-${index}" src="${s.audio_url}" ontimeupdate="updateSnippetProgress(${index})" onended="resetSnippet(${index})"></audio>
        </div>
      ` : '';

            el.innerHTML = `<button class="delete-btn" style="position: absolute; top: 15px; right: 15px;" onclick="deleteSnippet(${s.id})" title="Delete snippet">&times;</button>
        <div class="snippet-text" style="padding-right: 30px;">${s.text}</div>${audioHtml}<div class="snippet-date">${new Date(s.created_at).toLocaleString()}</div>`;
            container.appendChild(el);
        });
    };



    document.getElementById('addPlaylistBtn').onclick = () => {
        const nameInput = document.getElementById('newPlaylistName');
        const name = nameInput.value.trim();
        if (!name) return alert('Введите название плейлиста');

        fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }).then(() => {
            nameInput.value = '';
            loadProfile();
        });
    };

    window.addTrackToPlaylist = (playlistId) => {
        const trackId = document.getElementById(`select-track-${playlistId}`).value;
        fetch('/api/playlists/add-track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistId, trackId })
        }).then(() => loadProfile());
    };

    window.uploadToPlaylist = (playlistId) => {
        const fileInput = document.getElementById(`upload-pl-${playlistId}`);
        if (!fileInput.files[0]) return alert('Выберите файл');

        const formData = new FormData();
        formData.append('title', fileInput.files[0].name.split('.')[0]);
        formData.append('artist', 'Local Upload');
        formData.append('audio', fileInput.files[0]);

        fetch('/api/tracks', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fetch('/api/me').then(res => res.json()).then(profile => {
                        const newTrack = profile.tracks[profile.tracks.length - 1];
                        fetch('/api/playlists/add-track', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ playlistId, trackId: newTrack.id })
                        }).then(() => loadProfile());
                    });
                }
            });
    };

    window.toggleSnippet = (index) => {
        const audio = document.getElementById(`snippet-audio-${index}`);
        const btn = document.getElementById(`snippet-btn-${index}`);
        if (audio.paused) {
            document.querySelectorAll('.custom-snippet-player audio').forEach(a => a.pause());
            document.querySelectorAll('.snippet-play-btn').forEach(b => b.textContent = '▶');
            audio.play(); btn.textContent = '⏸';
        } else {
            audio.pause(); btn.textContent = '▶';
        }
    };

    window.updateSnippetProgress = (index) => {
        const audio = document.getElementById(`snippet-audio-${index}`);
        const progress = document.getElementById(`snippet-progress-${index}`);
        const time = document.getElementById(`snippet-time-${index}`);
        if (!audio.duration) return;
        progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
        const m = Math.floor(audio.currentTime / 60);
        const s = Math.floor(audio.currentTime % 60);
        time.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    };

    window.resetSnippet = (index) => {
        document.getElementById(`snippet-btn-${index}`).textContent = '▶';
        document.getElementById(`snippet-progress-${index}`).style.width = '0%';
        document.getElementById(`snippet-time-${index}`).textContent = '0:00';
    };

    window.deleteSnippet = (id) => {
        if (!confirm('Удалить этот сниппет?')) return;
        fetch(`/api/snippets/${id}`, { method: 'DELETE' }).then(() => loadProfile());
    };

    document.getElementById('addTrackBtn').onclick = () => {
        const title = document.getElementById('newTrackTitle').value, artist = document.getElementById('newTrackArtist').value;
        const audioFile = document.getElementById('newTrackAudio').files[0], coverFile = document.getElementById('newTrackCover').files[0];
        if (!title || !artist || !audioFile) return alert('Заполните название, артиста и выберите аудиофайл');
        const formData = new FormData();
        formData.append('title', title); formData.append('artist', artist); formData.append('audio', audioFile);
        if (coverFile) formData.append('cover', coverFile);
        fetch('/api/tracks', { method: 'POST', body: formData }).then(() => {
            loadProfile();
            ['newTrackTitle', 'newTrackArtist', 'newTrackAudio', 'newTrackCover'].forEach(id => document.getElementById(id).value = '');
        });
    };

    window.deleteTrack = (id) => {
        if (!confirm('Вы уверены?')) return;
        fetch(`/api/tracks/${id}`, { method: 'DELETE' }).then(() => loadProfile());
    };

    document.getElementById('addSnippetBtn').onclick = () => {
        const text = document.getElementById('newSnippetText').value, fileInput = document.getElementById('newSnippetAudio');
        const formData = new FormData(); formData.append('text', text);
        if (fileInput.files[0]) formData.append('audio', fileInput.files[0]);
        fetch('/api/snippets', { method: 'POST', body: formData }).then(() => { loadProfile(); document.getElementById('newSnippetText').value = ''; fileInput.value = ''; });
    };

    document.getElementById('editProfileForm').onsubmit = function(e) {
        e.preventDefault();
        fetch('/api/profile', { method: 'POST', body: new FormData(this) }).then(() => { document.getElementById('editModal').classList.remove('active'); loadProfile(); });
    };

    document.getElementById('openEditModalBtn').onclick = () => document.getElementById('editModal').classList.add('active');
    document.getElementById('closeEditModalBtn').onclick = () => document.getElementById('editModal').classList.remove('active');

    const formatTime = (sec) => isNaN(sec) ? "0:00" : `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;

    window.playTrack = (index) => {
        currentPlaylist = profileData.tracks; currentTrackIndex = index; loadTrack(currentPlaylist[currentTrackIndex]);
    };

    const loadTrack = (track) => {
        player.classList.add('active'); audio.src = track.audio_url;
        playerTitle.textContent = track.title; playerArtist.textContent = track.artist;
        playerCover.style.backgroundImage = track.cover_url ? `url('${track.cover_url}')` : 'none';
        playerCover.style.background = track.cover_url ? '' : '#222';
        audio.play(); playPauseBtn.textContent = '⏸';
    };

    playPauseBtn.onclick = () => {
        if (audio.paused) { audio.play(); playPauseBtn.textContent = '⏸'; }
        else { audio.pause(); playPauseBtn.textContent = '▶'; }
    };

    document.getElementById('nextBtn').onclick = () => {
        if (!currentPlaylist.length) return;
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
        loadTrack(currentPlaylist[currentTrackIndex]);
    };

    document.getElementById('prevBtn').onclick = () => {
        if (!currentPlaylist.length) return;
        currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadTrack(currentPlaylist[currentTrackIndex]);
    };

    closePlayerBtn.onclick = () => { player.classList.remove('active'); audio.pause(); };

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        progressBar.value = (audio.currentTime / audio.duration) * 100;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        durationEl.textContent = formatTime(audio.duration);
    });

    progressBar.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (progressBar.value / 100) * audio.duration;
    });

    audio.addEventListener('ended', () => {
        if (currentPlaylist.length > 1) document.getElementById('nextBtn').click();
        else { playPauseBtn.textContent = '▶'; progressBar.value = 0; }
    });

    loadProfile();
});
