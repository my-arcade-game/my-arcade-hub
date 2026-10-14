// ==========================================
// COUNTRIES.JS - UPDATED WEAPON EMOJIS
// ==========================================

var COUNTRIES = [
  {
    id: 'usa',
    name: 'USA 🇺🇸',
    flag: '🇺🇸',
    flagImg: 'assets/flags/us.webp',
    color: '#3c3b6e',
    weapon: '🪓',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'trump_airstrike',
    passiveId: 'DEFENSE_BUDGET'
  },
  {
    id: 'canada',
    name: 'CANADA 🇨🇦',
    flag: '🇨🇦',
    flagImg: 'assets/flags/canada.webp',
    color: '#ff0000',
    weapon: '🏒',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'maple_shield',
    passiveId: 'HEALTHCARE'
  },
  {
    id: 'china',
    name: 'CHINA 🇨🇳',
    flag: '🇨🇳',
    flagImg: 'assets/flags/china.webp',
    color: '#de2910',
    weapon: '⚔️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'dragon_fury',
    passiveId: 'GREAT_WALL'
  },
  {
    id: 'france',
    name: 'FRANCE 🇫🇷',
    flag: '🇫🇷',
    flagImg: 'assets/flags/france.webp',
    color: '#002395',
    weapon: '🥖',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'baguette_dash',
    passiveId: 'RESISTANCE'
  },
  {
    id: 'germany',
    name: 'GERMANY 🇩🇪',
    flag: '🇩🇪',
    flagImg: 'assets/flags/germany.webp',
    color: '#dd0000',
    weapon: '🪓',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'giant_weapon',
    passiveId: 'AUTOBAHN'
  },
  {
    id: 'indonesia',
    name: 'INDONESIA 🇮🇩',
    flag: '🇮🇩',
    flagImg: 'assets/flags/indonesia.webp',
    color: '#ff0000',
    weapon: '🗡️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'bambu_runcing',
    passiveId: 'RING_OF_FIRE'
  },
  {
    id: 'italy',
    name: 'ITALY 🇮🇹',
    flag: '🇮🇹',
    flagImg: 'assets/flags/italy.webp',
    color: '#009246',
    weapon: '🍕',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'pizza_spin',
    passiveId: 'RENAISSANCE'
  },
  {
    id: 'japan',
    name: 'JAPAN 🇯🇵',
    flag: '🇯🇵',
    flagImg: 'assets/flags/japan.webp',
    color: '#bc002d',
    weapon: '🗡️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'blade_frenzy',
    passiveId: 'NINJUTSU'
  },
  {
    id: 'malaysia',
    name: 'MALAYSIA 🇲🇾',
    flag: '🇲🇾',
    flagImg: 'assets/flags/malaysia.webp',
    color: '#010066',
    weapon: '🗡️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'keris_strike',
    passiveId: 'SILAT'
  },
  {
    id: 'north_korea',
    name: 'NORTH KOREA 🇰🇵',
    flag: '🇰🇵',
    flagImg: 'assets/flags/north korea.webp',
    color: '#024fa2',
    weapon: '🚀',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'nuke_strike',
    passiveId: 'ISOLATION'
  },
  {
    id: 'russia',
    name: 'RUSSIA 🇷🇺',
    flag: '🇷🇺',
    flagImg: 'assets/flags/rusia.webp',
    color: '#0033a0',
    weapon: '🪓',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'tsar_bomb',
    passiveId: 'WINTER'
  },
  {
    id: 'singapore',
    name: 'SINGAPORE 🇸🇬',
    flag: '🇸🇬',
    flagImg: 'assets/flags/singapore.webp',
    color: '#ed2939',
    weapon: '🔱',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'merlion_surge',
    passiveId: 'FINE_CITY'
  },
  {
    id: 'south_korea',
    name: 'SOUTH KOREA 🇰🇷',
    flag: '🇰🇷',
    flagImg: 'assets/flags/south korea.webp',
    color: '#0047a0',
    weapon: '🎤',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'kpop_fever',
    passiveId: 'TURTLE_SHIP'
  },
  {
    id: 'uk',
    name: 'UNITED KINGDOM 🇬🇧',
    flag: '🇬🇧',
    flagImg: 'assets/flags/uk.webp',
    color: '#00247d',
    weapon: '⚔️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'tea_time',
    passiveId: 'ISLAND'
  },
  {
    id: 'philippines',
    name: 'PHILIPPINES 🇵🇭',
    flag: '🇵🇭',
    flagImg: 'assets/flags/philippines.webp',
    color: '#0038a8',
    weapon: '🥊',
    hp: 100,
    speed: 3.9,
    dmg: 12,
    abilityId: 'pinoy_pride',
    passiveId: 'TYPHOON'
  },
  {
    id: 'thailand',
    name: 'THAILAND 🇹🇭',
    flag: '🇹🇭',
    flagImg: 'assets/flags/thailand.webp',
    color: '#a51931',
    weapon: '🐘',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'muay_thai_fury',
    passiveId: 'CLINCH'
  },
  {
    id: 'vietnam',
    name: 'VIETNAM 🇻🇳',
    flag: '🇻🇳',
    flagImg: 'assets/flags/vietnam.webp',
    color: '#da251d',
    weapon: '🎋',
    hp: 100,
    speed: 4.0,
    dmg: 11,
    abilityId: 'vietnam_bamboo',
    passiveId: 'GUERRILLA'
  },
  {
    id: 'india',
    name: 'INDIA 🇮🇳',
    flag: '🇮🇳',
    flagImg: 'assets/flags/india.webp',
    color: '#ff9933',
    weapon: '🏏',
    hp: 100,
    speed: 3.8,
    dmg: 13,
    abilityId: 'bollywood_blast',
    passiveId: 'YOGA'
  },
  {
    id: 'brazil',
    name: 'BRAZIL 🇧🇷',
    flag: '🇧🇷',
    flagImg: 'assets/flags/brazil.webp',
    color: '#009c3b',
    weapon: '⚽',
    hp: 100,
    speed: 4.1,
    dmg: 12,
    abilityId: 'samba_goal',
    passiveId: 'CAPOEIRA'
  },
  {
    id: 'turkey',
    name: 'TURKEY 🇹🇷',
    flag: '🇹🇷',
    flagImg: 'assets/flags/turkey.webp',
    color: '#e30a17',
    weapon: '⚔️',
    hp: 100,
    speed: 3.8,
    dmg: 12,
    abilityId: 'ice_cream_trick',
    passiveId: 'BOSPHORUS'
  }
];

// Helper to safely preload flag images for Canvas rendering
function preloadCountryImage(country) {
  if (!country || !country.flagImg) return;
  const img = new Image();
  img.src = encodeURI(country.flagImg);
  img.onload = () => {
    country.loadedImg = img;
  };
  img.onerror = () => {
    country.loadedImg = null;
  };
}

// Preload existing countries
COUNTRIES.forEach(preloadCountryImage);

// Attach COUNTRIES globally to window
window.COUNTRIES = COUNTRIES;

// Helper to dynamically register new countries in the future
window.registerCountry = function(countryConfig) {
  if (!countryConfig || !countryConfig.id) return;
  
  const existingIdx = COUNTRIES.findIndex(c => c.id === countryConfig.id);
  if (existingIdx !== -1) {
    COUNTRIES[existingIdx] = countryConfig;
  } else {
    COUNTRIES.push(countryConfig);
  }
  
  preloadCountryImage(countryConfig);

  if (window.MenuSystem && typeof window.MenuSystem.renderGrid === 'function') {
    window.MenuSystem.renderGrid();
  }
};