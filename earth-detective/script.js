// --- 1. GAME VARIABLES & STATE ---
let players = [];
let currentPlayerIndex = 0;
let selectedPlayerCount = 2;
let targetLat = 0;
let targetLng = 0;
let locationsList = [];
let usedLocations = [];
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
let isMapExpanded = false;

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

// Fisher-Yates array shuffling algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 35+ Diverse Global Locations (Fallback Pool)
const fallbackLocations = [
    { pic: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop", lat: 37.8651, lng: -119.5383 },
    { pic: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1000&auto=format&fit=crop", lat: 48.8584, lng: 2.2945 },
    { pic: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1000&auto=format&fit=crop", lat: 46.0207, lng: 14.4822 },
    { pic: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop", lat: 25.1972, lng: 55.2744 },
    { pic: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1000&auto=format&fit=crop", lat: -13.1631, lng: -72.5450 },
    { pic: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1000&auto=format&fit=crop", lat: 13.7563, lng: 100.5018 },
    { pic: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1000&auto=format&fit=crop", lat: 44.1068, lng: 9.7289 },
    { pic: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop", lat: 35.6762, lng: 139.6503 },
    { pic: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1000&auto=format&fit=crop", lat: 45.4408, lng: 12.3155 },
    { pic: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1000&auto=format&fit=crop", lat: 36.3932, lng: 25.4615 },
    { pic: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1000&auto=format&fit=crop", lat: 27.1751, lng: 78.0421 },
    { pic: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1000&auto=format&fit=crop", lat: -33.8568, lng: 151.2153 },
    { pic: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000&auto=format&fit=crop", lat: 51.5007, lng: -0.1246 },
    { pic: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop", lat: -22.9519, lng: -43.2105 },
    { pic: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=1000&auto=format&fit=crop", lat: 29.9792, lng: 31.1342 },
    { pic: "https://images.unsplash.com/photo-1548625361-18237e19b6e5?w=1000&auto=format&fit=crop", lat: 40.6892, lng: -74.0445 },
    { pic: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop", lat: 51.1789, lng: -1.8262 },
    { pic: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1000&auto=format&fit=crop", lat: -8.3405, lng: 115.0920 },
    { pic: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1000&auto=format&fit=crop", lat: 40.4319, lng: 116.5704 },
    { pic: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000&auto=format&fit=crop", lat: 41.8902, lng: 12.4922 },
    { pic: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1000&auto=format&fit=crop", lat: 30.3285, lng: 35.4444 },
    { pic: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&auto=format&fit=crop", lat: 27.9881, lng: 86.9250 },
    { pic: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop", lat: -16.5004, lng: -151.7415 },
    { pic: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1000&auto=format&fit=crop", lat: 37.9715, lng: 23.7267 },
    { pic: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&auto=format&fit=crop", lat: 64.1466, lng: -21.9426 },
    { pic: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1000&auto=format&fit=crop", lat: 37.8199, lng: -122.4783 },
    { pic: "https://images.unsplash.com/photo-1528164344705-47542687990d?w=1000&auto=format&fit=crop", lat: 35.3606, lng: 138.7274 },
    { pic: "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=1000&auto=format&fit=crop", lat: 3.1390, lng: 101.6869 },
    { pic: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1000&auto=format&fit=crop", lat: 15.2993, lng: 74.1240 },
    { pic: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1000&auto=format&fit=crop", lat: 24.6877, lng: 46.7219 },
    { pic: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1000&auto=format&fit=crop", lat: -1.2921, lng: 36.8219 }
];

const locationPhoto = document.getElementById('location-photo');
locationPhoto.onerror = function() {
    console.warn("External photo failed to load. Fetching next backup location.");
    loadNewRound();
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
        expandMap: "🔍 Expand",
        shrinkMap: "🔽 Shrink",
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
        expandMap: "🔍 Perbesar",
        shrinkMap: "🔽 Perkecil",
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
    
    updateMapToggleButtonLabel();
    updateExpandButtonLabel();
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

function updateExpandButtonLabel() {
    const currentLang = document.getElementById('language-select').value;
    const lang = langData[currentLang] || langData.en;
    const expandBtn = document.getElementById('expand-map-btn');
    
    if (expandBtn) {
        expandBtn.innerText = isMapExpanded ? lang.shrinkMap : lang.expandMap;
    }
}

// --- 3. LEAFLET MAP & ENHANCED WIKIPEDIA API ---
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
    SELECT DISTINCT ?pic ?geo WHERE { 
      ?item wdt:P31 ?type;
            wdt:P18 ?pic;
            wdt:P625 ?geo.
      VALUES ?type { wd:Q570116 wd:Q9259 wd:Q46169 wd:Q23413 }
    } LIMIT 500
`) + `&format=json`;

async function fetchWikipediaLocations() {
    try {
        const response = await fetch(WIKIDATA_URL, { headers: { 'Accept': 'application/sparql-results+json' } });
        const data = await response.json();
        if (data.results && data.results.bindings && data.results.bindings.length > 0) {
            const apiItems = data.results.bindings.map(b => {
                const coords = b.geo.value.replace("Point(", "").replace(")", "").split(" ");
                let imageUrl = b.pic.value;
                if (imageUrl.startsWith('http://')) imageUrl = imageUrl.replace('http://', 'https://');
                return { pic: imageUrl, lat: parseFloat(coords[1]), lng: parseFloat(coords[0]) };
            });
            locationsList = shuffleArray([...apiItems, ...fallbackLocations]);
        } else {
            locationsList = shuffleArray([...fallbackLocations]);
        }
    } catch (error) {
        console.warn("Wikipedia fetch failed, shuffling fallback list:", error);
        locationsList = shuffleArray([...fallbackLocations]);
    }
}
fetchWikipediaLocations();

async function loadNewRound() {
    if (locationsList.length === 0) {
        locationsList = shuffleArray([...fallbackLocations]);
    }
    
    const currentLocation = locationsList.pop();
    usedLocations.push(currentLocation);

    document.getElementById('location-photo').src = currentLocation.pic;
    targetLat = currentLocation.lat;
    targetLng = currentLocation.lng;
}

// --- 4. TOGGLEABLE & EXPANDABLE MAP CONTROLLER ---
const mapContainer = document.getElementById('guess-map-container');
const fixedMapToggleBtn = document.getElementById('fixed-map-toggle-btn');
const closeMapBtn = document.getElementById('close-map-btn');
const expandMapBtn = document.getElementById('expand-map-btn');

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

function toggleMapExpand() {
    isMapExpanded = !isMapExpanded;
    if (isMapExpanded) {
        mapContainer.classList.add('expanded');
    } else {
        mapContainer.classList.remove('expanded');
    }
    updateExpandButtonLabel();
    setTimeout(() => map.invalidateSize(), 200);
}

if (fixedMapToggleBtn) {
    fixedMapToggleBtn.addEventListener('click', () => toggleMap());
}

if (closeMapBtn) {
    closeMapBtn.addEventListener('click', () => toggleMap(false));
}

if (expandMapBtn) {
    expandMapBtn.addEventListener('click', () => toggleMapExpand());
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