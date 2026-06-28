(function () {
  'use strict';

  var songs = window.musicData || [];
  if (songs.length === 0) return;

  var STORAGE_KEY = 'musicPlayer';
  var currentIndex = 0;

  var btn, titleEl, artistEl, coverEl, labelEl;
  var audio = document.getElementById('music-player-audio');

  if (!audio) return;

  function formatTime(sec) {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        index: currentIndex,
        position: audio.currentTime,
        playing: !audio.paused
      }));
    } catch (e) {}
  }

  function updateSongUI(song) {
    titleEl.textContent = song.title || '';
    artistEl.textContent = song.artist || '';
    if (song.cover) {
      coverEl.src = song.cover;
      coverEl.style.display = '';
      labelEl.style.backgroundImage = 'url(' + song.cover + ')';
      labelEl.style.backgroundSize = 'cover';
      labelEl.style.backgroundPosition = 'center';
      labelEl.style.backgroundColor = 'transparent';
    } else {
      coverEl.style.display = 'none';
      labelEl.style.backgroundImage = '';
      labelEl.style.backgroundColor = '';
    }
  }

  function loadSong(index) {
    if (index < 0) index = songs.length - 1;
    if (index >= songs.length) index = 0;
    currentIndex = index;
    var song = songs[currentIndex];
    audio.src = song.src;
    updateSongUI(song);
    saveState();
  }

  function togglePlay() {
    if (audio.paused) {
      if (!audio.src) loadSong(currentIndex);
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
  }

  function updatePlayingState() {
    if (audio.paused) {
      btn.classList.remove('music-player-btn--playing');
    } else {
      btn.classList.add('music-player-btn--playing');
    }
  }

  function buildDOM() {
    btn = document.createElement('div');
    btn.className = 'music-player-btn';
    btn.innerHTML =
      '<div class="music-player-vinyl">' +
        '<div class="music-player-vinyl-label"></div>' +
        '<div class="music-player-vinyl-groove"></div>' +
        '<div class="music-player-vinyl-groove"></div>' +
        '<div class="music-player-vinyl-groove"></div>' +
      '</div>' +
      '<div class="music-player-arm">' +
        '<div class="music-player-arm-base"></div>' +
        '<div class="music-player-arm-stick"></div>' +
        '<div class="music-player-arm-head"></div>' +
      '</div>' +
      '<div class="music-player-tooltip">' +
        '<img class="music-player-tooltip-cover" src="" alt="cover">' +
        '<div class="music-player-tooltip-meta">' +
          '<div class="music-player-tooltip-title"></div>' +
          '<div class="music-player-tooltip-artist"></div>' +
        '</div>' +
      '</div>';

    btn.addEventListener('click', togglePlay);
    document.body.appendChild(btn);

    titleEl = btn.querySelector('.music-player-tooltip-title');
    artistEl = btn.querySelector('.music-player-tooltip-artist');
    coverEl = btn.querySelector('.music-player-tooltip-cover');
    labelEl = btn.querySelector('.music-player-vinyl-label');
  }

  var saveInterval = null;
  function startSaveInterval() {
    if (saveInterval) return;
    saveInterval = setInterval(saveState, 5000);
  }
  function stopSaveInterval() {
    if (saveInterval) {
      clearInterval(saveInterval);
      saveInterval = null;
    }
  }

  function bindAudioEvents() {
    audio.addEventListener('play', function () { updatePlayingState(); startSaveInterval(); });
    audio.addEventListener('pause', function () {
      updatePlayingState();
      stopSaveInterval();
      saveState();
    });
    audio.addEventListener('ended', function () {
      loadSong(currentIndex + 1);
      audio.play().catch(function () {});
    });
    window.addEventListener('beforeunload', saveState);
  }

  function restoreState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var state = JSON.parse(raw);
        currentIndex = state.index >= 0 && state.index < songs.length ? state.index : 0;
        var song = songs[currentIndex];
        audio.src = song.src;
        audio.currentTime = state.position || 0;
        updateSongUI(song);
      } else {
        loadSong(0);
      }
    } catch (e) {
      loadSong(0);
    }
  }

  buildDOM();
  bindAudioEvents();
  restoreState();
  updatePlayingState();
})();
