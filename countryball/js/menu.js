var MenuSystem = (() => {
  let selectedP1 = null;
  let selectedP2 = null;

  function init() {
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

  function selectCountry(country) {
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
        labelA.innerHTML = `<span>SELECT P1</span>`;
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
        labelB.innerHTML = `<span>SELECT P2</span>`;
      }
    }

    document.querySelectorAll('.card').forEach(card => {
      const id = card.dataset.id;
      card.classList.remove('selected-a', 'selected-b');

      if (selectedP1 && selectedP1.id === id) card.classList.add('selected-a');
      if (selectedP2 && selectedP2.id === id) card.classList.add('selected-b');
    });

    if (btnFight) {
      if (selectedP1 && selectedP2) {
        btnFight.style.opacity = '1';
        btnFight.style.pointerEvents = 'auto';
      } else {
        btnFight.style.opacity = '0.4';
        btnFight.style.pointerEvents = 'none';
      }
    }
  }

  function getSelections() {
    return { p1: selectedP1, p2: selectedP2 };
  }

  // Exposed renderGrid so external scripts can trigger UI refreshes
  return { init, renderGrid, updateUI, getSelections };
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