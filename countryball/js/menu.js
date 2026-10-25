// /countryball/js/menu.js
var MenuSystem = (() => {
  let selectedP1 = null;
  let selectedP2 = null;
  let isMultiplayer = false;
  let isHost = false;

  function init(multiplayerState = { active: false, isHost: false }) {
    isMultiplayer = multiplayerState.active;
    isHost = multiplayerState.isHost;
    selectedP1 = null;
    selectedP2 = null;
    renderGrid();
    updateUI();
  }

  function renderGrid() {
    const grid = document.getElementById('country-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);

    if (!list || list.length === 0) return;

    list.forEach(country => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = country.id;

      const imgSrc = country.activeImgSrc || country.flagImg;

      card.innerHTML = `
        <div class="flag-box">
          <img class="flag-img" 
               src="${encodeURI(imgSrc)}" 
               alt="${country.name}" 
               onerror="handleCardImgError(this, '${country.id}')">
        </div>
        <div class="name">${country.name}</div>
        <div class="stats">HP:${country.hp} SPD:${country.speed}</div>
      `;

      card.addEventListener('click', () => selectCountry(country));
      grid.appendChild(card);
    });

    updateUI();
  }

  function setSelection(slot, country) {
    if (slot === 'p1') {
      selectedP1 = country;
    } else if (slot === 'p2') {
      selectedP2 = country;
    }

    if (country && window.AudioSystem && window.AudioSystem.playCountrySound) {
      window.AudioSystem.playCountrySound(country.id);
    } else if (window.AudioSystem && window.AudioSystem.play) {
      window.AudioSystem.play('click');
    }

    updateUI();
  }

  function selectCountry(country) {
    if (isMultiplayer) {
      // 2-Device Online Mode: Host controls P1, Guest controls P2
      const targetSlot = isHost ? 'p1' : 'p2';
      const currentSelection = isHost ? selectedP1 : selectedP2;

      // Toggle selection off if clicking the already selected country
      const newCountry = (currentSelection && currentSelection.id === country.id) ? null : country;
      
      setSelection(targetSlot, newCountry);

      // Trigger realtime broadcast hook to update the other device
      if (window.onLocalSelectionChange) {
        window.onLocalSelectionChange(targetSlot, newCountry ? newCountry.id : null);
      }
    } else {
      // Single-Player / Local 1-Device Mode
      if (!selectedP1) {
        selectedP1 = country;
        if (window.AudioSystem && window.AudioSystem.playCountrySound) {
          window.AudioSystem.playCountrySound(country.id);
        }
      } else if (!selectedP2 && country !== selectedP1) {
        selectedP2 = country;
        if (window.AudioSystem && window.AudioSystem.playCountrySound) {
          window.AudioSystem.playCountrySound(country.id);
        }
      } else if (country === selectedP1) {
        selectedP1 = selectedP2;
        selectedP2 = null;
        if (window.AudioSystem && window.AudioSystem.play) {
          window.AudioSystem.play('click');
        }
      } else if (country === selectedP2) {
        selectedP2 = null;
        if (window.AudioSystem && window.AudioSystem.play) {
          window.AudioSystem.play('click');
        }
      }
      updateUI();
    }
  }

  function updateUI() {
    const labelA = document.getElementById('label-a');
    const labelB = document.getElementById('label-b');
    const btnFight = document.getElementById('btn-fight');

    if (labelA) {
      if (selectedP1) {
        const imgSrc = selectedP1.activeImgSrc || selectedP1.flagImg;
        labelA.innerHTML = `
          <img class="vs-flag-img" src="${encodeURI(imgSrc)}" alt="${selectedP1.name}" onerror="this.style.display='none'">
          <span>${selectedP1.name}</span>
        `;
      } else {
        const p1Label = isMultiplayer ? (isHost ? 'SELECT P1 (YOU)' : 'P1 (HOST)') : 'SELECT P1';
        labelA.innerHTML = `<span>${p1Label}</span>`;
      }
    }

    if (labelB) {
      if (selectedP2) {
        const imgSrc = selectedP2.activeImgSrc || selectedP2.flagImg;
        labelB.innerHTML = `
          <img class="vs-flag-img" src="${encodeURI(imgSrc)}" alt="${selectedP2.name}" onerror="this.style.display='none'">
          <span>${selectedP2.name}</span>
        `;
      } else {
        const p2Label = isMultiplayer ? (!isHost ? 'SELECT P2 (YOU)' : 'P2 (GUEST)') : 'SELECT P2';
        labelB.innerHTML = `<span>${p2Label}</span>`;
      }
    }

    document.querySelectorAll('.card').forEach(card => {
      const id = card.dataset.id;
      card.classList.remove('selected-a', 'selected-b');

      if (selectedP1 && selectedP1.id === id) card.classList.add('selected-a');
      if (selectedP2 && selectedP2.id === id) card.classList.add('selected-b');
    });

    if (btnFight) {
      // In online mode, only Host can press FIGHT once both P1 and P2 are chosen
      const canStart = selectedP1 && selectedP2 && (!isMultiplayer || isHost);
      if (canStart) {
        btnFight.style.opacity = '1';
        btnFight.style.pointerEvents = 'auto';
        btnFight.innerText = 'FIGHT!';
      } else {
        btnFight.style.opacity = '0.4';
        btnFight.style.pointerEvents = 'none';
        btnFight.innerText = (isMultiplayer && !isHost) ? 'WAITING FOR HOST...' : 'FIGHT!';
      }
    }
  }

  function getSelections() {
    return { p1: selectedP1, p2: selectedP2 };
  }

  // Exposed methods including setSelection so external network scripts can mirror selections
  return { init, renderGrid, updateUI, setSelection, getSelections };
})();

function handleCardImgError(imgElement, countryId) {
  const list = window.COUNTRIES || (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
  const country = list.find(c => c.id === countryId);
  if (!country) return;

  const sources = [country.flagImg, ...(country.altFlagImgs || [])];
  const currentSrc = imgElement.getAttribute('src') || imgElement.src || '';

  let currentIdx = -1;
  sources.forEach((src, idx) => {
    if (currentSrc.includes(encodeURI(src)) || currentSrc.includes(src)) {
      currentIdx = idx;
    }
  });

  if (currentIdx !== -1 && currentIdx + 1 < sources.length) {
    imgElement.src = encodeURI(sources[currentIdx + 1]);
  } else {
    const parent = imgElement.parentElement;
    if (parent) {
      parent.innerHTML = `<span style="font-size:26px;">${country.flag}</span>`;
    }
  }
}

// Global attachment
window.MenuSystem = MenuSystem;
window.handleCardImgError = handleCardImgError;