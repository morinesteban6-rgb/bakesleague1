(() => {
  'use strict';

  const D = window.RL_DATA;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Données ----------
  // Format d'un item : [id, nom, type, rareté, peignable, édition spéciale, échangeable, plan]
  const ITEMS = D.items.map(([id, name, slot, rarity, paintable, special, tradable, blueprint]) => ({
    id, name, slot, rarity, paintable: !!paintable, special: special ? D.specials[special] : '',
    tradable: !!tradable, blueprint: !!blueprint, search: name.toLowerCase(),
  }));
  const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
  const TITLES = D.titles.map(([id, name, color]) => ({ id, name, color, search: name.toLowerCase() }));
  const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));

  const SLOT_FR = {
    'Body': 'Voiture', 'Decal': 'Sticker', 'Paint Finish': 'Finition', 'Wheels': 'Roues', 'Rocket Boost': 'Boost',
    'Topper': 'Chapeau', 'Antenna': 'Antenne', 'Goal Explosion': 'Explosion de but', 'Trail': 'Traînée',
    'Engine Audio': 'Son moteur', 'Player Banner': 'Bannière', 'Avatar Border': "Bordure d'avatar",
    'Goal Stinger': 'Jingle de but', 'Gift Pack': 'Caisse / Pack', 'Blueprints': 'Plan', 'Underglow': 'Néon',
    'Bumper': 'Pare-chocs', 'Custom Finish': 'Finition perso', 'Other': 'Autres (drapeaux, équipes…)',
  };
  const SLOT_ICON = {
    'Body': '🚗', 'Decal': '🎨', 'Paint Finish': '✨', 'Wheels': '🛞', 'Rocket Boost': '🔥', 'Topper': '🎩',
    'Antenna': '📡', 'Goal Explosion': '💥', 'Trail': '💨', 'Engine Audio': '🔊', 'Player Banner': '🏳️',
    'Avatar Border': '🖼️', 'Goal Stinger': '🎵', 'Gift Pack': '🎁', 'Blueprints': '📜', 'Underglow': '💡',
    'Bumper': '🛡️', 'Custom Finish': '🖌️', 'Other': '🚩',
  };
  const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Import', 'Exotic', 'Black Market', 'Limited', 'Premium', 'Legacy'];
  const RARITY_FR = {
    'Common': 'Commun', 'Uncommon': 'Peu commun', 'Rare': 'Rare', 'Very Rare': 'Très rare', 'Import': 'Import',
    'Exotic': 'Exotique', 'Black Market': 'Marché noir', 'Limited': 'Limité', 'Premium': 'Premium', 'Legacy': 'Héritage',
  };
  const PAINT_HEX = {
    'Crimson': '#d21a1a', 'Lime': '#7fe52b', 'Black': '#151515', 'Sky Blue': '#4fc3f7', 'Cobalt': '#3f51b5',
    'Burnt Sienna': '#7b3f1e', 'Forest Green': '#2e7d32', 'Purple': '#8e24aa', 'Pink': '#f06292', 'Orange': '#fb8c00',
    'Grey': '#8e8e8e', 'Titanium White': '#f5f5f5', 'Saffron': '#fdd835', 'Gold': '#c9a44c',
  };
  const LIGHT_PAINTS = new Set(['Lime', 'Sky Blue', 'Titanium White', 'Saffron', 'Gold', 'Pink']);
  const TITLE_GROUPS = {
    '#FFFFFF': 'Classiques', '#FFEB5C': 'Champions / RLCS', '#9BFF00': 'Tournois', '#FF2800': 'Grand Champion',
    '#AEF7FF': 'Esport / Saisons', '#E8E8E8': 'Supersonic Legend', '#00FFAA': 'Spéciaux', '#FF8DDD': 'Tournois SSL',
  };
  const LOADOUT_SLOTS = [
    'Body', 'Decal', 'Paint Finish', 'Wheels', 'Rocket Boost', 'Topper', 'Antenna',
    'Goal Explosion', 'Trail', 'Engine Audio', 'Goal Stinger', 'Player Banner', 'Avatar Border',
  ];

  const slotName = (s) => SLOT_FR[s] || s;
  const rarityName = (r) => RARITY_FR[r] || r;
  const icon = (s) => SLOT_ICON[s] || '📦';

  // ---------- État (localStorage) ----------
  const KEY = 'bakesleague.v1';
  const DEFAULT = () => ({
    player: { name: 'Joueur' },
    unlockAllItems: false,
    unlockAllTitles: false,
    inventory: [], // { uid, id, paint, cert, qty }
    wishlist: [], // ids
    titlesOwned: [], // ids
    equippedTitle: null,
    loadout: {}, // slot -> { id, paint }
    trade: { have: [], want: [] }, // { id, paint, cert, qty }
  });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(DEFAULT(), JSON.parse(raw));
    } catch (e) { /* stockage indisponible */ }
    return DEFAULT();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  const ownedIds = () => new Set(S.inventory.map((e) => e.id));
  const ownsItem = (id) => S.unlockAllItems || S.inventory.some((e) => e.id === id);
  const ownsTitle = (id) => S.unlockAllTitles || S.titlesOwned.includes(id);

  // ---------- Petites aides d'affichage ----------
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
  }
  function paintPill(paint) {
    if (!paint) return '';
    const fg = LIGHT_PAINTS.has(paint) ? '#111' : '#fff';
    return `<span class="paint-pill" style="--pc:${PAINT_HEX[paint]};--pt:${fg}">${esc(paint)}</span>`;
  }
  function variantLabel(e) {
    const it = BY_ID.get(e.id);
    return [e.paint, e.cert, it ? it.name : '?', it && it.special ? `(${it.special})` : ''].filter(Boolean).join(' ');
  }
  function titleHtml(t) {
    if (!t) return '<span class="muted">Aucun titre</span>';
    return `<span class="title-text" style="--tc:${t.color}">${esc(t.name)}</span>`;
  }
  function fillSelect(sel, opts, allLabel) {
    sel.innerHTML = `<option value="">${allLabel}</option>` +
      opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  }

  // ---------- Navigation ----------
  const renderers = {};
  function show(view) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
    if (renderers[view]) renderers[view]();
    try { localStorage.setItem(KEY + '.tab', view); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));

  // ---------- Catalogue ----------
  const PAGE = 120;
  const slotsPresent = [...new Set(ITEMS.map((i) => i.slot))].sort((a, b) => slotName(a).localeCompare(slotName(b), 'fr'));
  const slotCount = (s) => ITEMS.filter((i) => i.slot === s).length;
  fillSelect($('#catSlot'), slotsPresent.map((s) => [s, `${slotName(s)} (${slotCount(s)})`]), 'Tous les types');
  fillSelect($('#catRarity'), RARITY_ORDER.map((r) => [r, rarityName(r)]), 'Toutes les raretés');
  fillSelect($('#invSlot'), slotsPresent.map((s) => [s, slotName(s)]), 'Tous les types');

  let catLimit = PAGE;
  let catResults = [];

  function filterCatalog() {
    const q = $('#catSearch').value.trim().toLowerCase();
    const slot = $('#catSlot').value;
    const rarity = $('#catRarity').value;
    const onlyTrade = $('#catTradable').checked;
    const onlyPaint = $('#catPaintable').checked;
    const onlyOwned = $('#catOwned').checked;
    const onlyWish = $('#catWish').checked;
    const owned = ownedIds();
    const wish = new Set(S.wishlist);
    const words = q.split(/\s+/).filter(Boolean);
    let res = ITEMS.filter((i) =>
      (!slot || i.slot === slot) &&
      (!rarity || i.rarity === rarity) &&
      (!onlyTrade || i.tradable) &&
      (!onlyPaint || i.paintable) &&
      (!onlyOwned || S.unlockAllItems || owned.has(i.id)) &&
      (!onlyWish || wish.has(i.id)) &&
      words.every((w) => i.search.includes(w)));
    const sort = $('#catSort').value;
    if (sort === 'rarity') res = res.slice().sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
    else if (sort === 'slot') res = res.slice().sort((a, b) => slotName(a.slot).localeCompare(slotName(b.slot), 'fr'));
    else if (q) {
      // Pertinence : nom exact, puis « commence par », puis le reste (tri stable)
      const rank = (i) => (i.search === q ? 0 : i.search.startsWith(q) ? 1 : 2);
      res = res.slice().sort((a, b) => rank(a) - rank(b));
    }
    return res;
  }

  function cardHtml(i, owned, wish) {
    const badges = [
      owned ? '<span class="badge owned">✓</span>' : '',
      wish ? '<span class="badge wish">♥</span>' : '',
    ].join('');
    const extra = [i.special, i.paintable ? 'Peignable' : '', i.tradable ? '' : 'Non échangeable'].filter(Boolean).join(' · ');
    return `<button class="card" data-r="${esc(i.rarity)}" data-id="${i.id}">
      <span class="badges">${badges}</span>
      <span class="icon">${icon(i.slot)}</span>
      <span class="name">${esc(i.name)}</span>
      <span class="rarity">${esc(rarityName(i.rarity))}</span>
      <span class="meta">${esc(slotName(i.slot))}${extra ? ' · ' + esc(extra) : ''}</span>
    </button>`;
  }

  function renderCatalog(reset = true) {
    if (reset) catLimit = PAGE;
    catResults = filterCatalog();
    const owned = ownedIds();
    const wish = new Set(S.wishlist);
    $('#catGrid').innerHTML = catResults.slice(0, catLimit)
      .map((i) => cardHtml(i, S.unlockAllItems || owned.has(i.id), wish.has(i.id))).join('') ||
      '<div class="empty">Aucun item ne correspond à ta recherche.</div>';
    $('#catCount').textContent = `${catResults.length.toLocaleString('fr-FR')} item(s) sur ${ITEMS.length.toLocaleString('fr-FR')}`;
    $('#catMore').hidden = catLimit >= catResults.length;
  }
  renderers.catalog = () => renderCatalog(true);

  let searchTimer;
  $('#catSearch').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => renderCatalog(true), 120); });
  ['#catSlot', '#catRarity', '#catSort', '#catTradable', '#catPaintable', '#catOwned', '#catWish']
    .forEach((s) => $(s).addEventListener('change', () => renderCatalog(true)));
  $('#catMore').addEventListener('click', () => { catLimit += PAGE; renderCatalog(false); });
  $('#catGrid').addEventListener('click', (ev) => {
    const c = ev.target.closest('.card');
    if (c) openItem(Number(c.dataset.id));
  });
  // Chargement automatique en bas de page
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !$('#catMore').hidden && $('#view-catalog').classList.contains('active')) {
        catLimit += PAGE; renderCatalog(false);
      }
    }, { rootMargin: '400px' }).observe($('#catMore'));
  }

  // ---------- Fenêtre item ----------
  let dlgItem = null;
  let dlgPaint = '';
  const dlg = $('#itemDialog');
  $('#dlgCert').innerHTML = '<option value="">Aucune</option>' + D.certs.map((c) => `<option>${esc(c)}</option>`).join('');

  function openItem(id, preset = {}) {
    const i = BY_ID.get(id);
    if (!i) return;
    dlgItem = i;
    dlgPaint = preset.paint || '';
    $('#dlgIcon').textContent = icon(i.slot);
    $('#dlgIcon').dataset.r = i.rarity;
    $('#dlgName').textContent = i.name;
    $('#dlgMeta').textContent = `${slotName(i.slot)} · ${rarityName(i.rarity)}`;
    $('#dlgFlags').innerHTML = [
      i.special && `<span class="chip">⭐ ${esc(i.special)}</span>`,
      `<span class="chip">${i.tradable ? '🔁 Échangeable' : '🔒 Non échangeable'}</span>`,
      i.paintable && '<span class="chip">🎨 Peignable</span>',
      i.blueprint && '<span class="chip">📜 Plan</span>',
      ownsItem(i.id) && '<span class="chip">✓ Possédé</span>',
    ].filter(Boolean).join('');
    $('#dlgPaintField').hidden = !i.paintable;
    renderPaints();
    $('#dlgCert').value = preset.cert || '';
    $('#dlgQty').value = 1;
    $('#dlgEquip').hidden = !LOADOUT_SLOTS.includes(i.slot);
    $('#dlgEquip').disabled = !ownsItem(i.id);
    $('#dlgEquip').title = ownsItem(i.id) ? '' : "Ajoute d'abord l'item à ton inventaire";
    $('#dlgWish').textContent = S.wishlist.includes(i.id) ? '♥ Retirer de la wishlist' : '♡ Wishlist';
    dlg.showModal();
  }
  function renderPaints() {
    $('#dlgPaints').innerHTML = `<button type="button" class="paint none ${dlgPaint ? '' : 'active'}" data-p="" title="Sans peinture"></button>` +
      D.paints.map((p) => `<button type="button" class="paint ${dlgPaint === p ? 'active' : ''}" data-p="${esc(p)}" title="${esc(p)}" style="--pc:${PAINT_HEX[p]}"></button>`).join('');
  }
  $('#dlgPaints').addEventListener('click', (ev) => {
    const b = ev.target.closest('.paint');
    if (b) { dlgPaint = b.dataset.p; renderPaints(); }
  });
  const dlgVariant = () => ({ id: dlgItem.id, paint: dlgItem.paintable ? dlgPaint : '', cert: $('#dlgCert').value });

  function addToInventory(v, qty) {
    const ex = S.inventory.find((e) => e.id === v.id && e.paint === v.paint && e.cert === v.cert);
    if (ex) ex.qty += qty; else S.inventory.push({ uid: uid(), ...v, qty });
    save();
  }
  $('#dlgAdd').addEventListener('click', () => {
    const qty = Math.max(1, Math.min(999, parseInt($('#dlgQty').value, 10) || 1));
    const v = dlgVariant();
    addToInventory(v, qty);
    toast(`Ajouté : ${qty} × ${variantLabel(v)}`);
    dlg.close(); refresh();
  });
  $('#dlgEquip').addEventListener('click', () => {
    equip(dlgItem.id, dlgItem.paintable ? dlgPaint : '');
    dlg.close();
  });
  $('#dlgWish').addEventListener('click', () => {
    const id = dlgItem.id;
    S.wishlist = S.wishlist.includes(id) ? S.wishlist.filter((x) => x !== id) : [...S.wishlist, id];
    save();
    toast(S.wishlist.includes(id) ? 'Ajouté à la wishlist' : 'Retiré de la wishlist');
    dlg.close(); refresh();
  });
  $('#dlgWant').addEventListener('click', () => {
    S.trade.want.push({ ...dlgVariant(), qty: 1 });
    save(); toast('Ajouté en [W] dans Échange');
    dlg.close();
  });

  function equip(id, paint) {
    const i = BY_ID.get(id);
    if (!i || !LOADOUT_SLOTS.includes(i.slot)) return;
    S.loadout[i.slot] = { id, paint: paint || '' };
    save();
    toast(`Équipé : ${i.name}`);
    refresh();
  }

  // ---------- Inventaire ----------
  function renderInventory() {
    const q = $('#invSearch').value.trim().toLowerCase();
    const slot = $('#invSlot').value;
    const total = S.inventory.reduce((n, e) => n + e.qty, 0);
    $('#invSummary').textContent = S.unlockAllItems
      ? `✅ Les ${ITEMS.length.toLocaleString('fr-FR')} items sont débloqués · ${S.inventory.length} variante(s) perso (${total} exemplaires)`
      : `${S.inventory.length} item(s) différent(s) · ${total} exemplaire(s) · ${S.wishlist.length} en wishlist`;
    $('#unlockAllItems').hidden = S.unlockAllItems;
    $('#lockAllItems').hidden = !S.unlockAllItems;

    const rows = S.inventory
      .map((e) => ({ e, i: BY_ID.get(e.id) }))
      .filter(({ i }) => i && (!slot || i.slot === slot) && (!q || i.search.includes(q)))
      .sort((a, b) => a.i.name.localeCompare(b.i.name, 'fr'));

    let html = rows.map(({ e, i }) => `
      <div class="row" data-r="${esc(i.rarity)}" data-uid="${e.uid}">
        <span class="icon">${icon(i.slot)}</span>
        <div class="grow">
          <div class="name">${esc(i.name)}</div>
          <div class="meta">${paintPill(e.paint)} ${e.cert ? '🏅 ' + esc(e.cert) + ' · ' : ''}${esc(slotName(i.slot))} · ${esc(rarityName(i.rarity))}${i.special ? ' · ' + esc(i.special) : ''}</div>
        </div>
        <span class="qty">×${e.qty}</span>
        <div class="actions">
          ${LOADOUT_SLOTS.includes(i.slot) ? '<button class="btn small" data-act="equip">Équiper</button>' : ''}
          <button class="btn small" data-act="have" ${i.tradable ? '' : 'disabled title="Non échangeable"'}>[H]</button>
          <button class="btn small" data-act="minus">−</button>
          <button class="btn small" data-act="plus">+</button>
          <button class="btn small danger" data-act="del" aria-label="Supprimer">✕</button>
        </div>
      </div>`).join('');
    if (!html) {
      html = S.unlockAllItems
        ? '<div class="empty">Tous les items sont débloqués. Ouvre le <b>Catalogue</b> pour les parcourir et les équiper, ou ajoute des variantes peintes / certifiées ici.</div>'
        : '<div class="empty">Ton inventaire est vide. Va dans le <b>Catalogue</b> et clique sur un item pour l\'ajouter, ou appuie sur « Débloquer tous les items ».</div>';
    }
    $('#invList').innerHTML = html;
  }
  renderers.inventory = renderInventory;
  $('#invSearch').addEventListener('input', renderInventory);
  $('#invSlot').addEventListener('change', renderInventory);
  $('#invList').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-act]');
    const row = ev.target.closest('.row');
    if (!row) return;
    const e = S.inventory.find((x) => x.uid === row.dataset.uid);
    if (!e) return;
    if (!b) { openItem(e.id, e); return; }
    switch (b.dataset.act) {
      case 'equip': equip(e.id, e.paint); return;
      case 'have': S.trade.have.push({ id: e.id, paint: e.paint, cert: e.cert, qty: 1 }); toast('Ajouté en [H] dans Échange'); break;
      case 'plus': e.qty++; break;
      case 'minus': if (e.qty > 1) e.qty--; break;
      case 'del': S.inventory = S.inventory.filter((x) => x !== e); break;
    }
    save(); renderInventory();
  });
  $('#unlockAllItems').addEventListener('click', () => {
    S.unlockAllItems = true; save();
    toast(`🎉 ${ITEMS.length.toLocaleString('fr-FR')} items débloqués !`);
    refresh();
  });
  $('#lockAllItems').addEventListener('click', () => {
    S.unlockAllItems = false;
    const owned = ownedIds();
    for (const slot of Object.keys(S.loadout)) if (!owned.has(S.loadout[slot].id)) delete S.loadout[slot];
    save(); refresh();
  });

  // ---------- Titres ----------
  let titleColor = '';
  let titleLimit = PAGE * 2;
  const colorCounts = TITLES.reduce((m, t) => (m[t.color] = (m[t.color] || 0) + 1, m), {});
  $('#titleColors').innerHTML = `<button class="chip active" data-c="">Toutes les couleurs (${TITLES.length})</button>` +
    Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]).map((c) =>
      `<button class="chip" data-c="${c}"><span class="dot" style="background:${c};box-shadow:0 0 6px ${c}"></span>${esc(TITLE_GROUPS[c] || c)} (${colorCounts[c]})</button>`).join('');
  $('#titleColors').addEventListener('click', (ev) => {
    const b = ev.target.closest('.chip');
    if (!b) return;
    titleColor = b.dataset.c;
    document.querySelectorAll('#titleColors .chip').forEach((x) => x.classList.toggle('active', x === b));
    titleLimit = PAGE * 2; renderTitles();
  });

  function titleCards(list, compact) {
    return list.map((t) => {
      const owned = ownsTitle(t.id);
      const eq = S.equippedTitle === t.id;
      return `<button type="button" class="title-card ${owned ? '' : 'locked'} ${eq ? 'equipped' : ''}" data-tid="${esc(t.id)}" style="--tc:${t.color}">
        ${compact ? '' : `<span class="state">${eq ? 'Équipé' : owned ? '' : '🔒'}</span>`}
        <span class="title-text">${esc(t.name)}</span>
      </button>`;
    }).join('');
  }

  function renderTitles() {
    const q = $('#titleSearch').value.trim().toLowerCase();
    const onlyOwned = $('#titleOwned').checked;
    const res = TITLES.filter((t) => (!titleColor || t.color === titleColor) && (!q || t.search.includes(q)) && (!onlyOwned || ownsTitle(t.id)));
    const ownedN = S.unlockAllTitles ? TITLES.length : S.titlesOwned.length;
    $('#titleSummary').textContent = `${ownedN} / ${TITLES.length} titres débloqués — clique sur un titre pour le débloquer, puis encore pour l'équiper.`;
    $('#unlockAllTitles').hidden = S.unlockAllTitles;
    $('#equippedTitle').outerHTML = `<span id="equippedTitle">${titleHtml(TITLE_BY_ID.get(S.equippedTitle))}</span>`;
    $('#unequipTitle').hidden = !S.equippedTitle;
    $('#titleCount').textContent = `${res.length} titre(s)`;
    $('#titleGrid').innerHTML = titleCards(res.slice(0, titleLimit)) || '<div class="empty">Aucun titre trouvé.</div>';
    $('#titleMore').hidden = titleLimit >= res.length;
  }
  renderers.titles = renderTitles;

  $('#titleSearch').addEventListener('input', () => { titleLimit = PAGE * 2; renderTitles(); });
  $('#titleOwned').addEventListener('change', () => { titleLimit = PAGE * 2; renderTitles(); });
  $('#titleMore').addEventListener('click', () => { titleLimit += PAGE * 2; renderTitles(); });
  $('#titleGrid').addEventListener('click', (ev) => {
    const b = ev.target.closest('.title-card');
    if (!b) return;
    const t = TITLE_BY_ID.get(b.dataset.tid);
    if (!ownsTitle(t.id)) {
      S.titlesOwned.push(t.id);
      toast(`Titre débloqué : ${t.name}`);
    } else {
      S.equippedTitle = t.id;
      toast(`Titre équipé : ${t.name}`);
    }
    save(); renderTitles();
  });
  $('#unlockAllTitles').addEventListener('click', () => {
    S.unlockAllTitles = true; save();
    toast(`🏆 ${TITLES.length} titres débloqués !`);
    renderTitles();
  });
  $('#lockAllTitles').addEventListener('click', () => {
    if (!confirm('Retirer tous les titres débloqués ?')) return;
    S.unlockAllTitles = false; S.titlesOwned = []; S.equippedTitle = null;
    save(); renderTitles();
  });
  $('#unequipTitle').addEventListener('click', () => { S.equippedTitle = null; save(); renderTitles(); });

  // Sélecteur de titre depuis le garage
  const tdlg = $('#titleDialog');
  function renderTitlePicker() {
    const q = $('#tdSearch').value.trim().toLowerCase();
    const list = TITLES.filter((t) => ownsTitle(t.id) && (!q || t.search.includes(q)));
    $('#tdGrid').innerHTML = list.length ? titleCards(list.slice(0, 300), true)
      : '<div class="empty">Aucun titre débloqué. Va dans l\'onglet <b>Titres</b> pour en débloquer (ou tous d\'un coup).</div>';
  }
  $('#pcTitle').addEventListener('click', () => { $('#tdSearch').value = ''; renderTitlePicker(); tdlg.showModal(); });
  $('#tdSearch').addEventListener('input', renderTitlePicker);
  $('#tdGrid').addEventListener('click', (ev) => {
    const b = ev.target.closest('.title-card');
    if (!b) return;
    S.equippedTitle = b.dataset.tid; save();
    tdlg.close(); renderGarage();
  });

  // ---------- Garage ----------
  function carSvg(color, wheelColor, decal) {
    return `<svg viewBox="0 0 520 220" role="img" aria-label="Aperçu de la voiture">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${color}" stop-opacity="1"/>
          <stop offset="1" stop-color="${color}" stop-opacity=".65"/>
        </linearGradient>
      </defs>
      <ellipse cx="260" cy="192" rx="220" ry="14" fill="#000" opacity=".45"/>
      <path d="M40 150 L60 112 Q70 96 92 94 L190 88 L238 52 Q250 44 268 44 L360 46 Q380 46 392 58 L428 92 L470 100 Q490 104 492 124 L494 150 Q494 162 482 162 L52 162 Q38 162 40 150 Z"
        fill="url(#body)" stroke="rgba(255,255,255,.35)" stroke-width="2"/>
      <path d="M248 58 Q256 52 268 52 L352 54 Q366 54 376 64 L404 90 L210 92 Z" fill="#0d1530" opacity=".85"/>
      ${decal ? `<path d="M80 130 L460 120 L466 140 L84 150 Z" fill="#fff" opacity=".18"/>` : ''}
      <rect x="470" y="112" width="18" height="10" rx="3" fill="#ffe08a"/>
      <circle cx="130" cy="160" r="34" fill="#0a0a0a"/><circle cx="130" cy="160" r="18" fill="${wheelColor}"/>
      <circle cx="404" cy="160" r="34" fill="#0a0a0a"/><circle cx="404" cy="160" r="18" fill="${wheelColor}"/>
    </svg>`;
  }

  function renderGarage() {
    $('#playerName').value = S.player.name || '';
    $('#pcTitle').innerHTML = titleHtml(TITLE_BY_ID.get(S.equippedTitle));

    const lo = (slot) => S.loadout[slot] && BY_ID.get(S.loadout[slot].id);
    const body = lo('Body');
    const bodyPaint = S.loadout.Body && S.loadout.Body.paint;
    const wheelPaint = S.loadout.Wheels && S.loadout.Wheels.paint;
    const decal = lo('Decal');
    let warn = '';
    if (decal && decal.name.includes(':')) {
      const forBody = decal.name.split(':')[0].trim();
      if (!body || body.name !== forBody) warn = `⚠ Ce sticker est pour la ${forBody}`;
    }
    $('#carPreview').innerHTML = carSvg(PAINT_HEX[bodyPaint] || '#2f8cff', PAINT_HEX[wheelPaint] || '#9aa4c4', !!decal) +
      `<span class="car-label">${body ? esc((bodyPaint ? bodyPaint + ' ' : '') + body.name) : 'Octane (par défaut)'}${decal ? ' · ' + esc(decal.name) : ''}</span>` +
      (warn ? `<span class="warn">${esc(warn)}</span>` : '');

    const banner = lo('Player Banner');
    $('#pcBanner').innerHTML = banner ? `<span class="pc-banner-label">🏳️ ${esc(banner.name)}</span>` : '';
    const border = S.loadout['Avatar Border'];
    $('#pcAvatar').style.setProperty('--ab', border ? (PAINT_HEX[border.paint] || 'var(--accent-2)') : '');

    $('#loadout').innerHTML = LOADOUT_SLOTS.map((slot) => {
      const it = lo(slot);
      const paint = S.loadout[slot] && S.loadout[slot].paint;
      return `<button class="slot" data-slot="${esc(slot)}" ${it ? `data-r="${esc(it.rarity)}"` : ''}>
        <span class="icon">${icon(slot)}</span>
        <span><span class="label">${esc(slotName(slot))}</span><br>
        <span class="val">${it ? (paint ? paintPill(paint) + ' ' : '') + esc(it.name) : '<span class="muted">Aucun</span>'}</span></span>
      </button>`;
    }).join('');

    const ownedTitles = S.unlockAllTitles ? TITLES.length : S.titlesOwned.length;
    const ownedItems = S.unlockAllItems ? ITEMS.length : ownedIds().size;
    $('#stats').innerHTML = [
      [ownedItems.toLocaleString('fr-FR'), `items possédés / ${ITEMS.length.toLocaleString('fr-FR')}`],
      [ownedTitles, `titres / ${TITLES.length}`],
      [S.wishlist.length, 'en wishlist'],
      [S.trade.have.length + S.trade.want.length, "items dans l'échange"],
    ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
  }
  renderers.garage = renderGarage;
  $('#playerName').addEventListener('input', (e) => { S.player.name = e.target.value; save(); });
  $('#loadout').addEventListener('click', (ev) => {
    const b = ev.target.closest('.slot');
    if (!b) return;
    const slot = b.dataset.slot;
    const cur = S.loadout[slot];
    if (cur) { openItem(cur.id, { paint: cur.paint }); return; }
    // Pas d'item équipé : ouvrir le catalogue filtré sur ce type
    $('#catSlot').value = slot;
    $('#catOwned').checked = true;
    show('catalog');
  });

  // ---------- Échange ----------
  function tradeRows(list, side) {
    if (!list.length) return '<div class="empty">Vide</div>';
    return list.map((e, idx) => {
      const i = BY_ID.get(e.id);
      if (!i) return '';
      return `<div class="row" data-r="${esc(i.rarity)}">
        <span class="icon">${icon(i.slot)}</span>
        <div class="grow"><div class="name">${esc(i.name)}</div>
        <div class="meta">${paintPill(e.paint)} ${e.cert ? '🏅 ' + esc(e.cert) : ''} ${esc(rarityName(i.rarity))}</div></div>
        <button class="btn small danger" data-side="${side}" data-idx="${idx}" aria-label="Retirer">✕</button>
      </div>`;
    }).join('');
  }
  function tradeText() {
    const fmt = (l) => l.map((e) => '• ' + variantLabel(e)).join('\n') || '• —';
    return `[H]\n${fmt(S.trade.have)}\n\n[W]\n${fmt(S.trade.want)}`;
  }
  function renderTrade() {
    $('#tradeHave').innerHTML = tradeRows(S.trade.have, 'have');
    $('#tradeWant').innerHTML = tradeRows(S.trade.want, 'want');
    $('#tradeText').textContent = tradeText();
  }
  renderers.trade = renderTrade;
  $('#view-trade').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-side]');
    if (!b) return;
    S.trade[b.dataset.side].splice(Number(b.dataset.idx), 1);
    save(); renderTrade();
  });
  $('#clearTrade').addEventListener('click', () => { S.trade = { have: [], want: [] }; save(); renderTrade(); });
  $('#copyTrade').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(tradeText()); toast('Offre copiée !'); }
    catch (e) { toast('Copie impossible — sélectionne le texte en bas.'); }
  });

  // ---------- Réglages ----------
  $('#about').innerHTML = `${ITEMS.length.toLocaleString('fr-FR')} items et ${TITLES.length} titres issus du jeu de données
    <a href="https://github.com/rocketleagueapi/items" target="_blank" rel="noopener">rocketleagueapi/items</a> (LGPL-3.0),
    extrait des fichiers du jeu. Application non officielle, sans lien avec Psyonix ni Epic Games.
    Le « déblocage » ne concerne que cette appli : il ne modifie pas ton compte Rocket League.`;
  $('#exportSave').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bakesleague-sauvegarde.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#importSave').addEventListener('change', async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      S = Object.assign(DEFAULT(), JSON.parse(await f.text()));
      save(); toast('Sauvegarde importée'); refresh();
    } catch (e) { toast('Fichier invalide'); }
    ev.target.value = '';
  });
  $('#resetSave').addEventListener('click', () => {
    if (!confirm('Effacer inventaire, titres, loadout et échange ?')) return;
    S = DEFAULT(); save(); refresh(); toast('Réinitialisé');
  });

  // ---------- Démarrage ----------
  function refresh() {
    const active = document.querySelector('.view.active');
    const view = active ? active.id.replace('view-', '') : 'garage';
    if (view === 'catalog') renderCatalog(false); // garde la position dans la liste
    else if (renderers[view]) renderers[view]();
  }
  let start = 'garage';
  try { start = localStorage.getItem(KEY + '.tab') || 'garage'; } catch (e) { /* ignore */ }
  show(document.getElementById('view-' + start) ? start : 'garage');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
