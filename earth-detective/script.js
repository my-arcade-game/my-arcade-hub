// --- 1. GAME VARIABLES & STATE ---
let players = [];
let currentPlayerIndex = 0;
let selectedPlayerCount = 2;
let targetLat = 0;
let targetLng = 0;
let locationsList = [];
let userMarker = null;
let musicPlaying = false;
let resultLine = null;
let actualMarker = null;

// Timer configuration states
let roundTimerInterval = null;
let timeRemaining = 30;
let maxTimerSetting = 30;
let maxHpSetting = 10000;
let isAudioUnlocked = false;

// Map state
let isMapOpen = true;

// UI Screens
const screens = {
    menu: document.getElementById('main-menu'),
    turn: document.getElementById('turn-screen'),
    game: document.getElementById('game-screen')
};

// Audio Elements
const audio = {
    bgm: document.getElementById('bgm'),
    ticking: document.getElementById('sfx-ticking'), 
    guess: document.getElementById('sfx-guess'),
    lose: document.getElementById('sfx-lose'),
    win: document.getElementById('sfx-win')
};

// Sound effect pools
const bgmTracks = ['bgm_1.mp3', 'bgm_2.mp3'];
const winTracks = ['win_1.mp3', 'win_2.mp3'];

// --- ROBUST MOBILE AUDIO UNLOCKER & SFX MANAGER ---
function unlockAllAudio() {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;

    if (window.AudioContext || window.webkitAudioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }

    const allElements = [audio.bgm, audio.ticking, audio.guess, audio.lose, audio.win];
    allElements.forEach(el => {
        if (el) {
            el.volume = 0.01;
            el.play().then(() => {
                el.pause();
                el.currentTime = 0;
                el.volume = 1.0;
            }).catch(() => {
                el.volume = 1.0;
            });
        }
    });

    bgmTracks.concat(winTracks).forEach(filename => {
        const temp = new Audio(filename);
        temp.volume = 0.01;
        temp.play().then(() => {
            temp.pause();
            temp.currentTime = 0;
        }).catch(() => {});
    });
}
window.unlockAllAudio = unlockAllAudio;

function playSFX(key) {
    unlockAllAudio();
    const original = audio[key];
    if (!original) return;

    try {
        const clone = original.cloneNode();
        clone.volume = 1.0;
        clone.play().catch(err => console.warn(`SFX ${key} blocked:`, err));
    } catch (e) {
        original.currentTime = 0;
        original.play().catch(() => {});
    }
}

function playRandomBGM() {
    if (!musicPlaying) return;
    unlockAllAudio();
    const randomTrack = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];
    audio.bgm.src = randomTrack;
    audio.bgm.loop = true;
    audio.bgm.volume = 0.8;
    audio.bgm.play().catch(err => console.log("BGM playback stalled: ", err));
}

function playRandomWin() {
    unlockAllAudio();
    const randomTrack = winTracks[Math.floor(Math.random() * winTracks.length)];
    audio.win.src = randomTrack;
    audio.win.volume = 1.0;
    audio.win.play().catch(err => console.log("Win sound error: ", err));
}

// Fallback locations
const fallbackLocations = [
    { pic: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop", lat: 37.8651, lng: -119.5383 },
    { pic: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1000&auto=format&fit=crop", lat: 48.8584, lng: 2.2945 },
    { pic: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1000&auto=format&fit=crop", lat: 46.0207, lng: 14.4822 },
    { pic: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop", lat: 25.1972, lng: 55.2744 }
];

const locationPhoto = document.getElementById('location-photo');
locationPhoto.onerror = function() {
    console.warn("External photo failed to load. Using fallback location.");
    const backup = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
    locationPhoto.src = backup.pic;
    targetLat = backup.lat;
    targetLng = backup.lng;
};

function customAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const msg = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-ok-btn');
        
        msg.innerHTML = message.replace(/\n/g, '<br>');
        modal.style.display = 'flex';
        
        function handleOk() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            resolve();
        }
        
        okBtn.addEventListener('click', handleOk);
    });
}

// --- 2. LANGUAGE DICTIONARY ---
const langData = {
    en: { 
        title: "Earth Detective: Survival", 
        hp: "Starting HP:", 
        timer: "Round Timer:", 
        players: "Number of Players:", 
        lang: "Language:", 
        start: "Start Game", 
        mapReady: "I'm Ready", 
        guess: "Make Guess", 
        dragText: "Move Map",
        mapOpen: "🗺️ Open Map",
        mapClose: "🗺️ Close Map",
        mapCloseHeader: "✖ Close"
    },
    id: { 
        title: "Detektif Bumi: Bertahan Hidup", 
        hp: "HP Awal:", 
        timer: "Waktu Ronde:", 
        players: "Jumlah Pemain:", 
        lang: "Bahasa:", 
        start: "Mulai Permainan", 
        mapReady: "Saya Siap", 
        guess: "Tebak Lokasi", 
        dragText: "Pindah Peta",
        mapOpen: "🗺️ Buka Peta",
        mapClose: "🗺️ Tutup Peta",
        mapCloseHeader: "✖ Tutup"
    }
};

document.getElementById('language-select').addEventListener('change', function(e) {
    const lang = langData[e.target.value];
    document.getElementById('ui-title').innerText = lang.title;
    document.getElementById('ui-hp-label').innerText = lang.hp;
    document.getElementById('ui-timer-label').innerText = lang.timer;
    document.getElementById('ui-players-label').innerText = lang.players;
    document.getElementById('ui-lang-label').innerText = lang.lang;
    document.getElementById('start-game-btn').innerText = lang.start;
    document.getElementById('begin-turn-btn').innerText = lang.mapReady;
    document.getElementById('guess-btn').innerText = lang.guess;
    
    const dragText = document.getElementById('drag-text');
    if (dragText) dragText.innerText = lang.dragText;
    
    updateMapToggleButtonLabel();
});

function updateMapToggleButtonLabel() {
    const currentLang = document.getElementById('language-select').value;
    const lang = langData[currentLang] || langData.en;
    const fixedBtn = document.getElementById('fixed-map-toggle-btn');
    const closeHeaderBtn = document.getElementById('close-map-btn');
    
    if (fixedBtn) {
        fixedBtn.innerText = isMapOpen ? lang.mapClose : lang.mapOpen;
    }
    if (closeHeaderBtn) {
        closeHeaderBtn.innerText = lang.mapCloseHeader;
    }
}

// --- 3. LEAFLET MAP & WIKIPEDIA API ---
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

map.on('click', function(e) {
    if (userMarker !== null) map.removeLayer(userMarker);
    userMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
});

const WIKIDATA_URL = `https://query.wikidata.org/sparql?query=` + encodeURIComponent(`
    SELECT ?pic ?geo WHERE { ?item wdt:P31 wd:Q570116. ?item wdt:P18 ?pic. ?item wdt:P625 ?geo. } LIMIT 200
`) + `&format=json`;

async function fetchWikipediaLocations() {
    try {
        const response = await fetch(WIKIDATA_URL, { headers: { 'Accept': 'application/sparql-results+json' } });
        const data = await response.json();
        if (data.results && data.results.bindings && data.results.bindings.length > 0) {
            locationsList = data.results.bindings;
        } else {
            console.warn("Wikidata returned empty results, defaulting to fallbacks.");
        }
    } catch (error) {
        console.error("Wikipedia load failed, using fallbacks:", error);
    }
}
fetchWikipediaLocations();

async function loadNewRound() {
    if (locationsList.length === 0) {
        const backup = fallbackLocations[Math.floor(Math.random() * fallbackLocations.length)];
        document.getElementById('location-photo').src = backup.pic;
        targetLat = backup.lat;
        targetLng = backup.lng;
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * locationsList.length);
    const randomLocation = locationsList[randomIndex];
    locationsList.splice(randomIndex, 1); 

    let imageUrl = randomLocation.pic.value;
    if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://');
    }

    document.getElementById('location-photo').src = imageUrl;
    
    const coords = randomLocation.geo.value.replace("Point(", "").replace(")", "").split(" ");
    targetLng = parseFloat(coords[0]);
    targetLat = parseFloat(coords[1]);
}

// --- 4. DRAGGABLE & TOGGLEABLE MAP CONTAINER ---
const mapContainer = document.getElementById('guess-map-container');
const mapHeader = document.getElementById('map-header');
const gameContainer = document.getElementById('game-container');
const fixedMapToggleBtn = document.getElementById('fixed-map-toggle-btn');
const closeMapBtn = document.getElementById('close-map-btn');

let isDragging = false;
let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

if (mapHeader) {
    mapHeader.addEventListener('pointerdown', (e) => {
        if (e.target.closest('#close-map-btn')) return;
        
        isDragging = true;
        mapHeader.setPointerCapture(e.pointerId);
        
        const containerRect = mapContainer.getBoundingClientRect();
        const gameRect = gameContainer.getBoundingClientRect();
        
        initialLeft = containerRect.left - gameRect.left;
        initialTop = containerRect.top - gameRect.top;
        
        startX = e.clientX;
        startY = e.clientY;
        
        mapContainer.style.bottom = 'auto';
        mapContainer.style.right = 'auto';
        mapContainer.style.left = `${initialLeft}px`;
        mapContainer.style.top = `${initialTop}px`;
    });

    mapHeader.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const gameRect = gameContainer.getBoundingClientRect();
        const containerRect = mapContainer.getBoundingClientRect();
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;
        
        const maxLeft = gameRect.width - containerRect.width;
        const maxTop = gameRect.height - containerRect.height;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        mapContainer.style.left = `${newLeft}px`;
        mapContainer.style.top = `${newTop}px`;
    });

    const stopDrag = (e) => {
        if (isDragging) {
            isDragging = false;
            try { mapHeader.releasePointerCapture(e.pointerId); } catch(err) {}
        }
    };

    mapHeader.addEventListener('pointerup', stopDrag);
    mapHeader.addEventListener('pointercancel', stopDrag);
}

function toggleMap(show) {
    if (typeof show === 'boolean') {
        isMapOpen = show;
    } else {
        isMapOpen = !isMapOpen;
    }

    if (isMapOpen) {
        mapContainer.classList.remove('map-hidden');
        setTimeout(() => map.invalidateSize(), 150);
    } else {
        mapContainer.classList.add('map-hidden');
    }
    updateMapToggleButtonLabel();
}

if (fixedMapToggleBtn) {
    fixedMapToggleBtn.addEventListener('click', () => toggleMap());
}

if (closeMapBtn) {
    closeMapBtn.addEventListener('click', () => toggleMap(false));
}

// --- 5. MENU & AUDIO CONTROLS ---
const playerBtns = document.querySelectorAll('.player-btn');
playerBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        unlockAllAudio();
        playerBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedPlayerCount = parseInt(this.getAttribute('data-count'));
    });
});

document.getElementById('toggle-music-btn').addEventListener('click', function() {
    unlockAllAudio();
    musicPlaying = !musicPlaying;
    this.innerText = musicPlaying ? "🔊 Music: ON" : "🔊 Music: OFF";
    if (musicPlaying) {
        if (screens.game.style.display === 'block' && timeRemaining <= 10 && maxTimerSetting <= 5000) {
            audio.ticking.play().catch(() => {});
        } else {
            playRandomBGM();
        }
    } else {
        audio.bgm.pause();
        audio.ticking.pause();
    }
});

document.getElementById('start-game-btn').addEventListener('click', function() {
    unlockAllAudio();
    maxHpSetting = parseInt(document.getElementById('starting-hp').value);
    maxTimerSetting = parseInt(document.getElementById('timer-setting').value);
    
    players = Array.from({ length: selectedPlayerCount }, (_, i) => ({ id: i + 1, hp: maxHpSetting, alive: true }));
    currentPlayerIndex = 0;
    
    buildArenaHealthBars(); 
    
    screens.menu.style.display = 'none';
    showTurnScreen();
});

// --- 6. BATTLE ROYALE GAMEPLAY LOOP ---
function buildArenaHealthBars() {
    const container = document.getElementById('all-players-health-container');
    container.innerHTML = ""; 
    
    players.forEach(p => {
        const row = document.createElement('div');
        row.id = `player-row-${p.id}`;
        row.className = "player-row-ui";
        
        row.innerHTML = `
            <div class="hb-meta-row">
                <span class="hb-name-tag">Player ${p.id}</span>
                <span id="hb-text-${p.id}" class="hb-arena-hp-text">${p.hp} HP</span>
            </div>
            <div class="hb-arena-track">
                <div id="hb-fill-${p.id}" class="hb-arena-fill"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function refreshArenaUIDashboard() {
    players.forEach(p => {
        const row = document.getElementById(`player-row-${p.id}`);
        const fill = document.getElementById(`hb-fill-${p.id}`);
        const text = document.getElementById(`hb-text-${p.id}`);
        
        if (!row || !fill || !text) return;
        
        text.innerText = `${p.hp} HP`;
        const percentage = (p.hp / maxHpSetting) * 100;
        fill.style.width = `${percentage}%`;
        
        row.classList.remove('active-turn', 'dead');
        if (!p.alive) {
            row.classList.add('dead');
        } else if (p.id === players[currentPlayerIndex].id) {
            row.classList.add('active-turn');
        }
    });
}

function startRoundClockCountdown() {
    if (maxTimerSetting > 5000) {
        document.getElementById('timer-display').innerText = "⏱️: ∞";
        return; 
    }
    
    timeRemaining = maxTimerSetting;
    const display = document.getElementById('timer-display');
    display.classList.remove('panic');
    display.innerText = `⏱️: ${timeRemaining}s`;
    
    clearInterval(roundTimerInterval); 
    roundTimerInterval = setInterval(() => {
        timeRemaining--;
        display.innerText = `⏱️: ${timeRemaining}s`;
        
        if (timeRemaining <= 10 && timeRemaining > 0) {
            if (musicPlaying) {
                audio.bgm.pause();
            }
            
            if (audio.ticking.paused) {
                audio.ticking.play().catch(err => console.log("Ticking playback stalled: ", err)); 
            }
        }
        
        if (timeRemaining <= 5) {
            display.classList.add('panic'); 
        }
        
        if (timeRemaining <= 0) {
            clearInterval(roundTimerInterval);
            audio.ticking.pause();
            audio.ticking.currentTime = 0;
            handleTimeExpirationPenalty(); 
        }
    }, 1000);
}

function stopRoundClockCountdown() {
    clearInterval(roundTimerInterval);
    audio.ticking.pause();
    audio.ticking.currentTime = 0;
}

function showTurnScreen() {
    loadNewRound(); 
    let p = players[currentPlayerIndex];
    document.getElementById('player-turn-text').innerText = `Player ${p.id}'s Turn`;
    document.getElementById('player-hp-text').innerText = `HP: ${p.hp} ❤️`;
    
    if (musicPlaying) {
        audio.ticking.pause();
        audio.ticking.currentTime = 0;
        if (audio.bgm.paused) {
            playRandomBGM();
        }
    }
    
    screens.game.style.display = 'none';
    screens.turn.style.display = 'flex';
}

document.getElementById('begin-turn-btn').addEventListener('click', function() {
    unlockAllAudio();
    screens.turn.style.display = 'none';
    screens.game.style.display = 'block';
    
    refreshArenaUIDashboard(); 
    toggleMap(true);
    setTimeout(() => {
        map.invalidateSize();
        startRoundClockCountdown(); 
    }, 100); 
});

async function handleTimeExpirationPenalty() {
    document.getElementById('guess-btn').style.display = 'none';
    
    const penaltyDamage = 5000;
    let p = players[currentPlayerIndex];
    
    playSFX('lose');

    await customAlert(`⏰ TIME EXPIRED!\nPlayer ${p.id} stood frozen and took a ${penaltyDamage} HP penalty! ⚡`);
    
    p.hp = Math.max(0, p.hp - penaltyDamage);
    refreshArenaUIDashboard();
    
    setTimeout(() => {
        evaluatePostTurnRules(p, penaltyDamage);
    }, 500);
}

document.getElementById('guess-btn').addEventListener('click', async function() {
    unlockAllAudio();
    if (userMarker === null) return await customAlert("Drop a pin first!");
    
    playSFX('guess'); 

    stopRoundClockCountdown(); 
    document.getElementById('guess-btn').style.display = 'none';

    const userLatLng = userMarker.getLatLng();
    const actualLatLng = [targetLat, targetLng];
    const distanceInMeters = map.distance(userLatLng, actualLatLng);
    const damage = Math.round(distanceInMeters / 1000);

    actualMarker = L.marker(actualLatLng).addTo(map);
    resultLine = L.polyline([userLatLng, actualLatLng], { color: 'red', weight: 3, className: 'animated-line' }).addTo(map);

    map.fitBounds(resultLine.getBounds(), { padding: [50, 50] });

    let p = players[currentPlayerIndex];
    p.hp = Math.max(0, p.hp - damage);
    refreshArenaUIDashboard(); 

    setTimeout(() => {
        evaluatePostTurnRules(p, damage);
    }, 2500); 
});

async function evaluatePostTurnRules(player, damageTaken) {
    if (player.hp <= 0) {
        player.alive = false;
        const aliveCount = players.filter(pl => pl.alive).length;
        
        if (aliveCount >= 1) {
            playSFX('lose');
        }
        
        await customAlert(`Player ${player.id} took ${damageTaken} damage and is ELIMINATED! 💀`);
    } else {
        await customAlert(`Player ${player.id} took ${damageTaken} damage!\nRemaining HP: ${player.hp} ❤️`);
    }

    if (userMarker) map.removeLayer(userMarker);
    if (actualMarker) map.removeLayer(actualMarker);
    if (resultLine) map.removeLayer(resultLine);
    userMarker = null;
    map.setView([20, 0], 2);
    
    document.getElementById('guess-btn').style.display = 'block';

    const alivePlayers = players.filter(pl => pl.alive);
    
    if (alivePlayers.length === 1) {
        audio.bgm.pause();
        audio.bgm.currentTime = 0;
        audio.ticking.pause();
        
        playRandomWin();
        await customAlert(`🎉 GAME OVER!\nPlayer ${alivePlayers[0].id} WINS! 🎉`);
        screens.game.style.display = 'none';
        screens.menu.style.display = 'flex';
    } else if (alivePlayers.length === 0) {
        audio.bgm.pause();
        audio.bgm.currentTime = 0;
        audio.ticking.pause();
        
        await customAlert("Everyone died! It's a draw.");
        screens.game.style.display = 'none';
        screens.menu.style.display = 'flex';
    } else {
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        } while (!players[currentPlayerIndex].alive);
        
        showTurnScreen();
    }
}