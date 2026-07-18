const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
};

export class HUD {
  constructor(root = document) {
    this.root = root;
    this.position = root.querySelector('[data-hud="position"]');
    this.lap = root.querySelector('[data-hud="lap"]');
    this.time = root.querySelector('[data-hud="time"]');
    this.speed = root.querySelector('[data-hud="speed"]');
    this.turbo = root.querySelector('[data-hud="turbo"]');
    this.countdown = root.querySelector('[data-hud="countdown"]');
    this.results = root.querySelector('[data-hud="results"]');
    this.item = root.querySelector('[data-hud="item"]');
    this.coins = root.querySelector('[data-hud="coins"]');
    this.coinEvent = root.querySelector('[data-hud="coin-event"]');
    this.lapBanner = root.querySelector('[data-hud="lap-banner"]');
    this.lapWave = root.querySelector('[data-hud="lap-wave"]');
    this.lastCoinEvent = null;
    this.coinEventTimer = null;
    this.lastPosition = null;
    this.lastLap = null;
    this.lastItem = undefined;
    this.lastCoinCount = null;
  }

  update(snapshot, kart, itemId = null, coinEvent = null) {
    this.position.textContent = `${snapshot.position}/${snapshot.total}`;
    this.lap.textContent = `VUELTA ${snapshot.lap}/${snapshot.totalLaps}`;
    this.time.textContent = formatTime(snapshot.time);
    this.speed.textContent = `${Math.round(Math.abs(kart.speed) * 3.6)}`;
    if (this.lastPosition !== null && this.lastPosition !== snapshot.position) this.#mark(this.position, 'bump');
    if (this.lastLap !== null && this.lastLap !== snapshot.lap) {
      this.#mark(this.lapBanner, 'wave');
      this.#mark(this.lapWave, 'travel');
    }
    if (this.lapBanner) this.lapBanner.textContent = `VUELTA ${snapshot.lap}/${snapshot.totalLaps}`;
    this.lastPosition = snapshot.position;
    this.lastLap = snapshot.lap;
    const drift = kart.driftState;
    const slipstream = kart.slipstreamState;
    this.turbo.style.setProperty('--charge', `${Math.min(drift.charge / 1.35, 1) * 100}%`);
    this.turbo.dataset.level = drift.level === 2 || drift.boostLevel === 2 ? 'orange' : drift.level === 1 || drift.boostLevel === 1 ? 'blue' : 'none';
    this.turbo.dataset.wind = slipstream.active ? 'boost' : slipstream.charge > 0 ? 'charge' : 'none';
    const turboLabel = this.turbo.querySelector('span');
    if (turboLabel) turboLabel.textContent = slipstream.active ? 'REBUFO Â¡VUELA!' : slipstream.charge > 0 ? `REBUFO ${Math.round((slipstream.charge / 1.4) * 100)}%` : 'MINI-TURBO';
    if (this.item) {
      const item = {
        bubble: ['◌', 'BURBUJA'],
        pearl: ['◆', 'PERLA'],
        shell: ['⬡', 'CONCHA'],
        shellshot: ['◉', 'CAPARAZÓN'],
      }[itemId] ?? ['?', 'VACÍO'];
      this.item.dataset.item = itemId ?? 'none';
      const icon = this.item.querySelector('span');
      const label = this.item.querySelector('small');
      if (icon) icon.textContent = item[0];
      if (label) label.textContent = item[1];
      if (this.lastItem !== undefined && this.lastItem !== itemId) this.#mark(this.item, 'pop');
      this.lastItem = itemId;
    }
    if (this.coins) this.coins.textContent = `☀ ${kart.coinCount ?? 0}/10`;
    const coinCount = kart.coinCount ?? 0;
    if (this.lastCoinCount !== null && this.lastCoinCount !== coinCount) this.#mark(this.coins, 'pulse');
    this.lastCoinCount = coinCount;
    if (coinEvent && coinEvent !== this.lastCoinEvent && this.coinEvent) {
      this.lastCoinEvent = coinEvent;
      const collected = coinEvent.type === 'coin-collect';
      this.coinEvent.textContent = collected ? '+ SOLAR' : `-${coinEvent.count} SOLAR`;
      this.coinEvent.dataset.state = collected ? 'collect' : 'loss';
      this.coinEvent.dataset.visible = 'true';
      clearTimeout(this.coinEventTimer);
      this.coinEventTimer = setTimeout(() => { this.coinEvent.dataset.visible = 'false'; }, 820);
    }
    if (snapshot.state === 'countdown') {
      this.countdown.textContent = snapshot.countdown || '¡YA!';
      this.countdown.dataset.visible = 'true';
    } else if (this.countdown.dataset.done !== 'true') {
      this.countdown.textContent = '¡YA!';
      this.countdown.dataset.visible = 'true';
      this.countdown.dataset.done = 'true';
      setTimeout(() => { this.countdown.dataset.visible = 'false'; }, 650);
    }
    if (snapshot.state === 'finished') this.#showResults(snapshot.results, snapshot.time);
  }

  #showResults(results, raceTime) {
    if (this.results.dataset.visible === 'true') return;
    this.results.innerHTML = `<div class="results-card"><small>CLASIFICACIÓN</small><h1>RACE RESULTS</h1>${results.map((entry) => `<div class="result-row"><b>${entry.position}</b><span>${entry.name}</span><time>${entry.time === null ? formatTime(raceTime + entry.position * 1.7) : formatTime(entry.time)}</time></div>`).join('')}<p>Recarga para volver a correr</p></div>`;
    this.results.dataset.visible = 'true';
  }

  #mark(element, name) {
    if (!element) return;
    element.dataset[name] = 'false';
    void element.offsetWidth;
    element.dataset[name] = 'true';
  }
}
