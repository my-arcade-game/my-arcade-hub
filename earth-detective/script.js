import { Multiplayer } from '../shared/multiplayer.js';

// --- 1. GAME VARIABLES & STATE ---
let players = [];
let selectedPlayerCount = 2;
let targetLat = 0;
let targetLng = 0;
let locationsList = [];
let usedLocations = [];

// Preload Cache Pool (Keeps up to 5 upcoming images in memory)
const imageCachePool = [];

// Map Markers & Lines
let userMarker = null;
let opponentMarker = null;
let actualMarker = null;
let userLine = null;
let opponentLine = null;
let mapPopups = [];

let musicPlaying = false;
let isAudioUnlocked = false;

// Web Audio API Synthesizer Context for Custom Sound Effects
let audioCtx = null;

// Dual-Mode Multiplayer State
let isMultiplayerActive = false;
let isHost = false;
let myPlayerId = 1;
let roundEvaluated = false;

// Timer configuration states
let roundTimerInterval = null;
let timeRemaining = 30;
let maxTimerSetting = 30;
let maxHpSetting = 10000;

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

// Custom Leaflet Icons for P1 (Cyan), P2 (Pink), and Actual Target (Gold Star)
const p1Icon = L.divIcon({
    className: 'custom-pin p1-pin',
    html: '<div class="pin-head p1-head">P1</div><div class="pin-pointer"></div>',
    iconSize: [30, 42],
    iconAnchor: [15, 42]
});

const p2Icon = L.divIcon({
    className: 'custom-pin p2-pin',
    html: '<div class="pin-head p2-head">P2</div><div class="pin-pointer"></div>',
    iconSize: [30, 42],
    iconAnchor: [15, 42]
});

const targetIcon = L.divIcon({
    className: 'custom-pin target-pin',
    html: '<div class="pin-head target-head">📍</div><div class="pin-pointer target-pointer"></div>',
    iconSize: [34, 46],
    iconAnchor: [17, 46]
});

// --- DUAL MODE & SUPABASE MULTIPLAYER INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    const modeBadge = document.getElementById('mode-badge');
    const playerButtons = document.getElementById('player-buttons');
    const startBtn = document.getElementById('start-game-btn');

    // Preload next 5 fallback locations right away
    preloadNext5Images(fallbackLocations);

    if (roomCode) {
        await Multiplayer.init();
        isMultiplayerActive = true;
        isHost = Multiplayer.isHost;
        myPlayerId = isHost ? 1 : 2;
        selectedPlayerCount = 2;

        if (modeBadge) {
            modeBadge.innerText = `ROOM: ${Multiplayer.roomCode} | ${isHost ? 'P1 (HOST)' : 'P2 (GUEST)'}`;
            modeBadge.style.color = isHost ? '#00f2fe' : '#ff0055';
        }

        if (playerButtons) {
            playerButtons.querySelectorAll('.player-btn').forEach(btn => {
                if (btn.getAttribute('data-count') !== '2') {
                    btn.style.opacity = '0.3';
                    btn.style.pointerEvents = 'none';
                }
            });
        }

        if (!isHost && startBtn) {
            startBtn.style.opacity = '0.5';
            startBtn.style.pointerEvents = 'none';
            startBtn.innerText = 'WAITING FOR HOST...';
        }

        // Realtime Event Synchronization for Simultaneous Gameplay
        if (Multiplayer.channel) {
            Multiplayer.channel.on('broadcast', { event: 'start_earth_game' }, (payload) => {
                const data = payload.payload;
                maxHpSetting = data.hp;
                maxTimerSetting = data.timer;
                selectedPlayerCount = 2;
                targetLat = data.targetLat;
                targetLng = data.targetLng;

                const photoEl = document.getElementById('location-photo');
                photoEl.src = data.photoPic;

                players = [
                    { id: 1, hp: maxHpSetting, alive: true, currentGuess: null },
                    { id: 2, hp: maxHpSetting, alive: true, currentGuess: null }
                ];

                screens.menu.style.display = 'none';
                startSimultaneousRound();
            });

            Multiplayer.channel.on('broadcast', { event: 'start_next_round' }, (payload) => {
                const data = payload.payload;
                targetLat = data.targetLat;
                targetLng = data.targetLng;

                const photoEl = document.getElementById('location-photo');
                photoEl.src = data.photoPic;
                startSimultaneousRound();
            });

            Multiplayer.channel.on('broadcast', { event: 'submit_earth_guess' }, (payload) => {
                const { playerId, lat, lng } = payload.payload;
                const p = players.find(pl => pl.id === playerId);
                if (p) {
                    p.currentGuess = { lat, lng };
                }
                checkAllGuessesSubmitted();
            });
        }
    } else {
        if (modeBadge) {
            modeBadge.innerText = 'SOLO / LOCAL PLAY';
            modeBadge.style.color = '#05ffa1';
        }
    }
});

// --- PRELOAD EXACTLY NEXT 5 IMAGES ---
function preloadNext5Images(sourceList) {
    const list = sourceList || locationsList;
    if (!list || !list.length) return;

    // Slice up to 5 items ahead
    const next5 = list.slice(-5);
    next5.forEach(loc => {
        if (loc && loc.pic) {
            const img = new Image();
            img.src = loc.pic;
            imageCachePool.push(img);
        }
    });
}

// --- AUDIO SYNTHESIZER FOR MEASUREMENT & DAMAGE IMPACT ---
function initWebAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

function playMeasureTicks(durationMs = 1200) {
    initWebAudio();
    if (!audioCtx) return;

    const tickCount = 14;
    const interval = durationMs / tickCount;

    for (let i = 0; i < tickCount; i++) {
        setTimeout(() => {
            try {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(440 + (i * 35), audioCtx.currentTime);

                gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start();
                osc.stop(audioCtx.currentTime + 0.05);
            } catch (e) {}
        }, i * interval);
    }
}

function playDamageHitSound() {
    initWebAudio();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
}

function unlockAllAudio() {
    if (isAudioUnlocked) return;
    isAudioUnlocked = true;
    initWebAudio();

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
    if (isHost || !isMultiplayerActive) loadNewRound();
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
    const myPlayer = players.find(p => p.id === myPlayerId) || players[0];
    if (myPlayer && myPlayer.currentGuess) return; 

    if (userMarker !== null) map.removeLayer(userMarker);
    const icon = myPlayerId === 1 ? p1Icon : p2Icon;
    userMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: icon }).addTo(map);
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
    // Preload next 5 from fetched location list
    preloadNext5Images(locationsList);
}
fetchWikipediaLocations();

function getRandomLocation() {
    if (locationsList.length === 0) {
        locationsList = shuffleArray([...fallbackLocations]);
    }
    const loc = locationsList.pop();
    usedLocations.push(loc);

    // Keep preloading next 5 images ahead
    preloadNext5Images(locationsList);

    return loc;
}

function loadNewRound() {
    const currentLocation = getRandomLocation();
    targetLat = currentLocation.lat;
    targetLng = currentLocation.lng;
    
    const photoEl = document.getElementById('location-photo');
    photoEl.src = currentLocation.pic;

    if (isMultiplayerActive && isHost && Multiplayer.channel) {
        Multiplayer.channel.send({
            type: 'broadcast',
            event: 'start_next_round',
            payload: {
                targetLat: currentLocation.lat,
                targetLng: currentLocation.lng,
                photoPic: currentLocation.pic
            }
        });
    }

    startSimultaneousRound();
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
        if (isMultiplayerActive) return;
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
    if (isMultiplayerActive && !isHost) return;

    unlockAllAudio();
    maxHpSetting = parseInt(document.getElementById('starting-hp').value);
    maxTimerSetting = parseInt(document.getElementById('timer-setting').value);
    
    players = Array.from({ length: selectedPlayerCount }, (_, i) => ({ id: i + 1, hp: maxHpSetting, alive: true, currentGuess: null }));
    
    const initialLocation = getRandomLocation();
    targetLat = initialLocation.lat;
    targetLng = initialLocation.lng;
    
    const photoEl = document.getElementById('location-photo');
    photoEl.src = initialLocation.pic;

    if (isMultiplayerActive && isHost && Multiplayer.channel) {
        Multiplayer.channel.send({
            type: 'broadcast',
            event: 'start_earth_game',
            payload: {
                hp: maxHpSetting,
                timer: maxTimerSetting,
                targetLat: initialLocation.lat,
                targetLng: initialLocation.lng,
                photoPic: initialLocation.pic
            }
        });
    }

    screens.menu.style.display = 'none';
    startSimultaneousRound();
});

// --- 6. SIMULTANEOUS GAMEPLAY & REASONING LOOP ---
function buildArenaHealthBars() {
    const container = document.getElementById('all-players-health-container');
    container.innerHTML = ""; 
    
    players.forEach(p => {
        const row = document.createElement('div');
        row.id = `player-row-${p.id}`;
        row.className = "player-row-ui active-turn";
        
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
        fill.style.width = `${Math.max(0, percentage)}%`;
        
        row.classList.remove('dead');
        if (!p.alive) {
            row.classList.add('dead');
        }
    });
}

function startSimultaneousRound() {
    roundEvaluated = false;
    players.forEach(p => p.currentGuess = null);

    // Clean Map Elements
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (opponentMarker) { map.removeLayer(opponentMarker); opponentMarker = null; }
    if (actualMarker) { map.removeLayer(actualMarker); actualMarker = null; }
    if (userLine) { map.removeLayer(userLine); userLine = null; }
    if (opponentLine) { map.removeLayer(opponentLine); opponentLine = null; }
    mapPopups.forEach(pop => map.removeLayer(pop));
    mapPopups = [];

    map.setView([20, 0], 2);

    // Reset Guess Button
    const guessBtn = document.getElementById('guess-btn');
    guessBtn.style.display = 'block';
    guessBtn.style.opacity = '1';
    guessBtn.style.pointerEvents = 'auto';
    guessBtn.innerText = 'Make Guess';

    screens.turn.style.display = 'none';
    screens.game.style.display = 'block';

    buildArenaHealthBars();
    refreshArenaUIDashboard();
    toggleMap(true);

    // Set Timer to Loading State until Photo is Completely Revealed
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.innerText = "⌛ LOADING...";
        timerDisplay.classList.remove('panic');
    }

    stopRoundClockCountdown();

    const photoEl = document.getElementById('location-photo');
    let timerStarted = false;

    const onPhotoReady = () => {
        if (timerStarted) return;
        timerStarted = true;
        map.invalidateSize();
        startRoundClockCountdown();
    };

    if (photoEl.complete && photoEl.naturalWidth !== 0) {
        onPhotoReady();
    } else {
        photoEl.onload = onPhotoReady;
    }
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
            evaluateRoundResults(); 
        }
    }, 1000);
}

function stopRoundClockCountdown() {
    clearInterval(roundTimerInterval);
    audio.ticking.pause();
    audio.ticking.currentTime = 0;
}

// SUBMIT GUESS
document.getElementById('guess-btn').addEventListener('click', function() {
    unlockAllAudio();
    if (userMarker === null) return customAlert("Drop a pin first!");
    
    const userLatLng = userMarker.getLatLng();
    const myPlayer = players.find(p => p.id === myPlayerId) || players[0];
    myPlayer.currentGuess = { lat: userLatLng.lat, lng: userLatLng.lng };

    playSFX('guess');

    const guessBtn = document.getElementById('guess-btn');
    guessBtn.style.opacity = '0.5';
    guessBtn.style.pointerEvents = 'none';
    guessBtn.innerText = isMultiplayerActive ? 'Waiting for Opponent...' : 'Processing...';

    if (isMultiplayerActive && Multiplayer.channel) {
        Multiplayer.channel.send({
            type: 'broadcast',
            event: 'submit_earth_guess',
            payload: {
                playerId: myPlayerId,
                lat: userLatLng.lat,
                lng: userLatLng.lng
            }
        });
    }

    checkAllGuessesSubmitted();
});

function checkAllGuessesSubmitted() {
    const alivePlayers = players.filter(p => p.alive);
    const allGuessed = alivePlayers.every(p => p.currentGuess !== null);

    if (allGuessed && !roundEvaluated) {
        stopRoundClockCountdown();
        evaluateRoundResults();
    }
}

// --- ANIMATED MEASUREMENT & GEOGUESSR DISTANCE HP IMPACT ---
async function evaluateRoundResults() {
    if (roundEvaluated) return;
    roundEvaluated = true;

    stopRoundClockCountdown();
    document.getElementById('guess-btn').style.display = 'none';

    // 1. Reveal Target Location Pin
    const actualLatLng = [targetLat, targetLng];
    actualMarker = L.marker(actualLatLng, { icon: targetIcon }).addTo(map);

    let playerStats = [];
    let boundsGroup = [actualLatLng];

    // 2. Plot All Player Pins and Calculate Distances
    players.forEach(p => {
        if (!p.alive) return;

        if (p.currentGuess) {
            const pLatLng = [p.currentGuess.lat, p.currentGuess.lng];
            const distMeters = map.distance(pLatLng, actualLatLng);
            const distKm = Math.round(distMeters / 1000);

            boundsGroup.push(pLatLng);

            const icon = p.id === 1 ? p1Icon : p2Icon;
            if (p.id !== myPlayerId || !userMarker) {
                const mk = L.marker(pLatLng, { icon: icon }).addTo(map);
                if (p.id === myPlayerId) userMarker = mk;
                else opponentMarker = mk;
            }

            playerStats.push({ player: p, distKm, latLng: pLatLng });
        } else {
            playerStats.push({ player: p, distKm: 15000, latLng: null });
        }
    });

    if (boundsGroup.length > 1) {
        map.fitBounds(L.latLngBounds(boundsGroup), { padding: [50, 50] });
    }

    if (!isMapExpanded) toggleMapExpand();

    // 3. Trigger Measuring Animation & Measurement SFX
    playMeasureTicks(1400);

    playerStats.forEach(stat => {
        if (stat.latLng) {
            const color = stat.player.id === 1 ? '#00f2fe' : '#ff0055';
            const line = L.polyline([stat.latLng, actualLatLng], {
                color: color,
                weight: 4,
                dashArray: '8, 8',
                className: 'animated-line'
            }).addTo(map);

            if (stat.player.id === myPlayerId) userLine = line;
            else opponentLine = line;

            const midLat = (stat.latLng[0] + targetLat) / 2;
            const midLng = (stat.latLng[1] + targetLng) / 2;
            const popup = L.popup({ autoClose: false, closeOnClick: false, className: 'distance-popup' })
                .setLatLng([midLat, midLng])
                .setContent(`<b style="color:${color}">P${stat.player.id}:</b> ${stat.distKm.toLocaleString()} km`)
                .openOn(map);
            mapPopups.push(popup);
        }
    });

    await new Promise(r => setTimeout(r, 1400));

    // 4. Calculate GeoGuessr Farthest vs Closest HP Damage
    let damageLog = [];
    if (playerStats.length >= 2) {
        playerStats.sort((a, b) => a.distKm - b.distKm);
        const winnerStat = playerStats[0];
        const loserStat = playerStats[playerStats.length - 1];

        const damageDiff = loserStat.distKm - winnerStat.distKm;

        if (damageDiff > 0) {
            loserStat.player.hp = Math.max(0, loserStat.player.hp - damageDiff);

            triggerDamagePopupAndShake(loserStat.player.id, damageDiff);

            damageLog.push(`🎯 Player ${winnerStat.player.id} was closest! (${winnerStat.distKm.toLocaleString()} km)`);
            damageLog.push(`💥 Player ${loserStat.player.id} takes -${damageDiff.toLocaleString()} HP damage!`);
        } else {
            damageLog.push(`⚖️ PERFECT TIE! Both players were equally distant (${winnerStat.distKm.toLocaleString()} km). No damage!`);
        }
    } else if (playerStats.length === 1) {
        damageLog.push(`Player ${playerStats[0].player.id}: ${playerStats[0].distKm.toLocaleString()} km`);
    }

    playerStats.forEach(s => {
        if (s.player.hp <= 0) s.player.alive = false;
    });

    await new Promise(r => setTimeout(r, 600));
    refreshArenaUIDashboard();

    // 5. Display Round Results Modal & Transition
    await customAlert(`📍 ROUND RESULTS:\n\n` + damageLog.join('\n'));

    const alivePlayers = players.filter(p => p.alive);

    if (alivePlayers.length === 1) {
        audio.bgm.pause();
        audio.ticking.pause();
        playRandomWin();
        await customAlert(`🎉 GAME OVER!\nPlayer ${alivePlayers[0].id} WINS! 🎉`);
        screens.game.style.display = 'none';
        screens.menu.style.display = 'flex';
    } else if (alivePlayers.length === 0) {
        audio.bgm.pause();
        audio.ticking.pause();
        await customAlert("Everyone died! It's a draw.");
        screens.game.style.display = 'none';
        screens.menu.style.display = 'flex';
    } else {
        if (isHost || !isMultiplayerActive) {
            loadNewRound();
        }
    }
}

// --- POPUP FLOATING DAMAGE NUMBERS & HUD SHAKE EFFECT ---
function triggerDamagePopupAndShake(targetPlayerId, damageAmount) {
    const targetRow = document.getElementById(`player-row-${targetPlayerId}`);
    const overlayContainer = document.getElementById('damage-overlay-container');

    playDamageHitSound();

    if (targetRow) {
        targetRow.classList.remove('hp-hit-shake');
        void targetRow.offsetWidth;
        targetRow.classList.add('hp-hit-shake');

        setTimeout(() => targetRow.classList.remove('hp-hit-shake'), 600);
    }

    if (overlayContainer && targetRow) {
        const rect = targetRow.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'floating-damage-text';
        popup.innerText = `-${damageAmount.toLocaleString()}`;
        
        popup.style.left = `${rect.left + rect.width / 2}px`;
        popup.style.top = `${rect.top + 10}px`;

        overlayContainer.appendChild(popup);

        setTimeout(() => {
            if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
        }, 1000);
    }
}