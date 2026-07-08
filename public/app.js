let site = null;
let selectedPlan = null;
let pollTimer = null;
let liveSeconds = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const LANGUAGE_KEY = 'privacyLanguage';
const translations = {
  'pt-BR': {
    pageTitle: 'Privacy',
    pageDescription: 'Perfil, assinaturas e conteúdos exclusivos',
    subscriptions: 'Assinaturas',
    secureNote: 'Pagamento seguro com acesso imediato após confirmação',
    postsLabel: 'Postagens',
    mediaLabel: 'Mídias',
    filterAll: 'Todos',
    filterForYou: 'Para Você',
    filterPhotos: 'Fotos',
    filterVideos: 'Vídeos',
    checkoutHeadline: 'Tenha acesso a tudo isso:',
    accountTitle: 'Crie sua conta para acessar',
    immediateAccess: 'Acesso imediato após pagamento',
    liveNow: '● AO VIVO'
  },
  en: {
    pageTitle: 'Privacy',
    pageDescription: 'Profile, subscriptions and exclusive content',
    subscriptions: 'Subscriptions',
    secureNote: 'Secure payment with instant access after confirmation',
    postsLabel: 'Posts',
    mediaLabel: 'Media',
    filterAll: 'All',
    filterForYou: 'For You',
    filterPhotos: 'Photos',
    filterVideos: 'Videos',
    checkoutHeadline: 'Get access to all this:',
    accountTitle: 'Create your account to access',
    immediateAccess: 'Instant access after payment',
    liveNow: '● LIVE'
  }
};

function currentLang() {
  return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'pt-BR';
}

function t(key, fallback = '') {
  const lang = currentLang();
  return translations[lang]?.[key] || translations['pt-BR'][key] || fallback || key;
}

function polishText(value) {
  const text = String(value || '');
  const exact = {
    '1 mes de acesso': '1 mês de acesso',
    '3 meses de acesso': '3 meses de acesso',
    'ACESSO VITALICIO': 'ACESSO VITALÍCIO',
    'Sao Paulo': 'São Paulo',
    'Sorocaba, Sao Paulo': 'Sorocaba, São Paulo',
    'Mogi das Cruzes, Sao Paulo': 'Mogi das Cruzes, São Paulo',
    'Midias': 'Mídias',
    'Para Voce': 'Para Você',
    'Videos': 'Vídeos',
    'Codigo PIX copiado.': 'Código PIX copiado.',
    'Gerando cobranca...': 'Gerando cobrança...',
    'Detectando pagamento automaticamente...': 'Detectando pagamento automaticamente...',
    'Aguardando confirmacao...': 'Aguardando confirmação...'
  };
  return exact[text] || text
    .replace(/\bmes\b/gi, (match) => match === 'MES' ? 'MÊS' : 'mês')
    .replace(/\bvoce\b/gi, 'você')
    .replace(/\bvideos\b/gi, 'vídeos')
    .replace(/\bmidias\b/gi, 'mídias')
    .replace(/\bpromocao\b/gi, 'promoção')
    .replace(/\bconfirmacao\b/gi, 'confirmação')
    .replace(/\bconteudos\b/gi, 'conteúdos')
    .replace(/\baudios\b/gi, 'áudios')
    .replace(/\be\b propriedade\b/gi, 'é propriedade')
    .replace(/\bSao Paulo\b/g, 'São Paulo');
}

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 2200);
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = polishText(value);
}

function setImage(selector, src) {
  const el = $(selector);
  if (el) el.src = src || '';
}

function setBackground(selector, src) {
  const el = $(selector);
  if (el) el.style.backgroundImage = src ? `url("${src}")` : '';
}

function setHtml(selector, value) {
  const el = $(selector);
  if (el) el.innerHTML = escapeHtml(polishText(value)).replace(/\n/g, '<br>');
}

function applyLanguage() {
  const lang = currentLang();
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  $$('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n, el.textContent);
  });
  $$('.lang-current').forEach((el) => { el.textContent = lang === 'en' ? 'EN' : 'PT'; });
  $$('[data-lang-option]').forEach((button) => {
    button.classList.toggle('active', button.dataset.langOption === lang);
  });
}

function parseLive(value) {
  const [m, s] = String(value || '07:19').split(':').map(Number);
  return (Number.isFinite(m) ? m : 7) * 60 + (Number.isFinite(s) ? s : 19);
}

function formatSeconds(total) {
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function renderProfile() {
  document.title = site.profile.siteTitle || site.profile.name || 'Privacy';
  setImage('#logo', site.profile.logo);
  setImage('#avatar', site.profile.avatar);
  setImage('#feedAvatar', site.profile.avatar);
  setImage('#checkoutAvatar', site.profile.avatar);
  setImage('#verifiedIcon', site.profile.verifiedIcon);
  setImage('#feedVerifiedIcon', site.profile.verifiedIcon);
  setImage('#bannerImage', site.profile.banner);
  setBackground('#banner', site.profile.banner);
  setBackground('#checkoutBanner', site.profile.banner);
  setText('#profileName', site.profile.name);
  setText('#feedName', site.profile.name);
  setText('#checkoutName', site.profile.name);
  setText('#handle', site.profile.handle);
  setText('#feedHandle', site.profile.handle);
  setText('#checkoutHandle', site.profile.handle);
  setHtml('#bio', site.profile.bio);
  setText('#locationText', site.profile.location);
  setText('#legalNotice', site.profile.legalNotice);
  setText('#postsCount', site.profile.stats?.posts || '0');
  setText('#mediaCount', site.profile.stats?.media || '0');
  const instagram = $('#instagram');
  const threads = $('#threads');
  if (instagram) {
    instagram.href = site.profile.instagram || '#';
    instagram.innerHTML = socialIcon('instagram');
  }
  if (threads) {
    threads.href = site.profile.threads || '#';
    threads.innerHTML = socialIcon('threads');
  }

  const verified = $('#verifiedIcon');
  if (verified) verified.hidden = !site.profile.verifiedIcon;

  const stats = site.profile.stats || {};
  $('#stats').innerHTML = [
    ['photos', stats.likes],
    ['videos', stats.followers],
    ['lock', stats.comments],
    ['heart', stats.views]
  ].map(([icon, value]) => `<span class="stat-item">${statIcon(icon)}<span class="stat-value">${escapeHtml(value || 0)}</span></span>`).join('');

  liveSeconds = parseLive(site.profile.liveStart);
  setText('#liveTime', formatSeconds(liveSeconds));
  setInterval(() => {
    liveSeconds += 1;
    setText('#liveTime', formatSeconds(liveSeconds));
  }, 1000);
}

function renderPlans() {
  const plans = (site.plans || []).filter((plan) => plan.active !== false);
  selectedPlan = plans[0] || null;
  const markup = plans.map((plan) => planButton(plan, 'plan-button')).join('');
  $('#plans').innerHTML = markup;
  $('#checkoutPlans').innerHTML = plans.map((plan) => checkoutPlanButton(plan)).join('');
  $$('.plan-button').forEach((button) => button.addEventListener('click', () => openCheckout(button.dataset.planId)));
  $$('.checkout-plan').forEach((button) => button.addEventListener('click', () => selectPlan(button.dataset.planId)));
  selectPlan(selectedPlan?.id);
}

function planButton(plan, className) {
  return privacyPlanButton(plan, className);
}

function checkoutPlanButton(plan) {
  const featured = plan.featured ? ' featured' : '';
  const discountClass = plan.featured ? 'discount-featured' : 'discount-muted';
  return `
    <button class="checkout-plan${featured}" data-plan-id="${escapeHtml(plan.id)}" type="button">
      <span class="checkout-plan-copy">
        ${plan.featured ? '<span class="best-choice" aria-hidden="true">&#9733; MELHOR ESCOLHA</span>' : ''}
        <strong class="plan-name">${escapeHtml(polishText(plan.name))}</strong>
      </span>
      <span class="plan-price plan-price-wrap">
        ${plan.oldPrice || plan.discount ? `<span class="strike-stack">${plan.discount ? `<span class="plan-discount ${discountClass}">${escapeHtml(plan.discount)}</span>` : ''}${plan.oldPrice ? `<span class="strike">${brl(plan.oldPrice)}</span>` : ''}</span>` : ''}
        <strong>${brl(plan.price)}</strong>
      </span>
    </button>`;
}

function privacyPlanButton(plan, className) {
  const featured = plan.featured ? ' featured' : '';
  const subscriptionClass = className === 'plan-button' ? ' subscription-plan-button' : '';
  const discountClass = plan.featured ? 'discount-featured' : 'discount-muted';
  return `
    <button class="${className}${subscriptionClass}${featured}" data-plan-id="${escapeHtml(plan.id)}" type="button">
      ${plan.featured ? '<span class="best-choice" aria-hidden="true">&#9733; MELHOR ESCOLHA</span>' : ''}
      <span class="plan-name">${escapeHtml(polishText(plan.name))}</span>
      <span class="plan-price plan-price-wrap">
        ${plan.oldPrice || plan.discount ? `<span class="strike-stack">${plan.discount ? `<span class="plan-discount ${discountClass}">${escapeHtml(plan.discount)}</span>` : ''}${plan.oldPrice ? `<span class="strike">${brl(plan.oldPrice)}</span>` : ''}</span>` : ''}
        <strong>${brl(plan.price)}</strong>
      </span>
    </button>`;
}

function statIcon(name) {
  const icons = {
    photos: '<svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"></rect><circle cx="8.5" cy="9.5" r="1.6"></circle><path d="M5.5 17l4.4-4.7 3.1 3.1 2.1-2.3 3.4 3.9"></path></svg>',
    videos: '<svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.2"></rect><path d="M3.5 9h17"></path><path d="M10 11.2l4.4 2.8L10 16.8z"></path></svg>',
    lock: '<svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10" width="13" height="10" rx="2"></rect><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"></path></svg>',
    heart: '<svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 5.9a5.2 5.2 0 0 0-7.4 0L12 6.9l-1-1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.4-7.7a5.2 5.2 0 0 0 0-7.4z"></path></svg>'
  };
  return icons[name] || '';
}

function socialIcon(name) {
  const icons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.2"></rect><circle cx="12" cy="12" r="3.4"></circle><circle cx="16.9" cy="7.1" r="1"></circle></svg>',
    threads: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.2 11.3c1.9.7 3.1 2 3.1 4 0 3.1-2.7 5.2-6.4 5.2-3.5 0-6.2-1.9-6.2-5.1 0-2 1.2-3.5 3.2-4.2"></path><path d="M8.2 8.8c.7-3.3 2.7-5.3 5.3-5.3 2.8 0 4.8 2.1 5.5 5.7"></path><path d="M5.4 8.6c4.1-1.4 8.4-1.5 13.2 0"></path><path d="M8.5 12.2c2.2-.9 4.9-1 7.2-.1"></path><path d="M11.1 15.1c.9-1.1 2.7-1.1 3.7 0"></path></svg>'
  };
  return icons[name] || '';
}

function selectPlan(planId) {
  const plan = (site.plans || []).find((item) => item.id === planId) || (site.plans || [])[0];
  if (!plan) return;
  selectedPlan = plan;
  $$('.checkout-plan').forEach((button) => button.classList.toggle('active', button.dataset.planId === plan.id));
  setText('#selectedPlanCopy', plan.durationDays > 0 ? `Tenha apenas ${plan.name.toLowerCase()}` : 'Tenha acesso vitalício');
  setText('#selectedPlanPrice', brl(plan.price));
  setText('#chargePlanName', plan.name);
  setText('#chargePlanValue', brl(plan.price));
  setText('#accountPlanName', plan.name);
  setText('#accountPlanPrice', brl(plan.price));
}

function renderGallery() {
  const preview = (site.gallery || []).find((item) => item.type === 'preview') || (site.gallery || [])[0];
  const gallery = site.gallery || [];
  const mosaicItems = gallery.filter((item) => item.id !== preview?.id).slice(0, 3);
  const postCard = $('.locked-post');
  if (postCard) {
    postCard.innerHTML = `
      <div class="post-collection">
        ${mosaicItems.map((item, index) => collectionTileMarkup(item, index === 0 ? 'featured' : 'small')).join('')}
      </div>
      <div class="post-top">
        <div class="post-author">
          <img src="${escapeHtml(site.profile.avatar)}" alt="Avatar">
          <div>
            <strong>${escapeHtml(site.profile.name)}${site.profile.verifiedIcon ? `<img class="feed-verified-icon" src="${escapeHtml(site.profile.verifiedIcon)}" alt="Verificado">` : ''}</strong>
            <span>${escapeHtml(site.profile.handle)}</span>
          </div>
        </div>
        <span class="dots" aria-hidden="true">&#8942;</span>
      </div>
      <div class="post-bottom">
        <span class="post-actions" aria-hidden="true">
          <span class="post-icon">${postIcon('heart')}</span>
          <span class="post-icon">${postIcon('comment')}</span>
          <span class="post-icon post-icon-coin">${postIcon('coin')}</span>
        </span>
        <span class="post-icon post-icon-save" aria-hidden="true">${postIcon('save')}</span>
      </div>`;
  }
  setImage('#previewImage', preview?.src || '');
  $('#gallery').innerHTML = gallery.map((item) => `
    <button class="gallery-tile media-tile" data-open-checkout data-category="${item.category || 'all'}" data-type="${item.type || 'photo'}" type="button">
      <img src="${item.src}" alt="${item.title || 'Midia exclusiva'}" loading="lazy">
      <span class="tile-lock" aria-hidden="true">${lockSvg()}</span>
    </button>
  `).join('');
  $$('[data-open-checkout]').forEach((el) => el.addEventListener('click', () => openCheckout(selectedPlan?.id)));
}

function lockedMediaMarkup(item, className = '') {
  return `
    <button class="mosaic-tile ${className}" type="button">
      <img src="${escapeHtml(item?.src || '')}" alt="${escapeHtml(item?.title || 'Midia exclusiva')}" loading="lazy">
      <span class="tile-lock" aria-hidden="true"></span>
    </button>`;
}

function collectionTileMarkup(item, className = '') {
  return `
    <div class="collection-tile ${className}">
      <img src="${escapeHtml(item?.src || '')}" alt="${escapeHtml(item?.title || 'Midia exclusiva')}" loading="lazy">
      <div class="collection-lock">${lockSvg()}</div>
    </div>`;
}

function lockSvg() {
  return '<svg class="lock-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2.5"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path><path d="M12 14v3"></path></svg>';
}

function postIcon(name) {
  const icons = {
    heart: '<svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 5.9a5.2 5.2 0 0 0-7.4 0L12 6.9l-1-1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.4-7.7a5.2 5.2 0 0 0 0-7.4z"></path></svg>',
    comment: '<svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.6a7.4 7.4 0 0 1-7.8 7.2 8.8 8.8 0 0 1-3.8-.9L4 19l1.2-4a7.1 7.1 0 0 1-.9-3.4A7.5 7.5 0 0 1 12 4.2a7.5 7.5 0 0 1 8 7.4z"></path></svg>',
    coin: '<svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.4"></circle><path d="M12 7.2v9.6"></path><path d="M15.2 9.1c-.7-.7-1.7-1.1-3-1.1-1.6 0-2.7.8-2.7 2 0 1.1.8 1.7 2.8 2.2 1.9.5 2.7 1.1 2.7 2.2 0 1.2-1.2 2-2.9 2-1.4 0-2.6-.5-3.4-1.3"></path></svg>',
    save: '<svg class="post-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15.2L12 16.5l-5.5 3.2z"></path></svg>'
  };
  return icons[name] || '';
}

function renderCheckoutCopy() {
  setText('#checkoutHeadline', site.checkout?.headline);
  setText('#accountTitle', site.checkout?.accountTitle);
  setText('#generatePix', site.checkout?.buttonText || 'Gerar PIX');
  setText('#processingText', site.checkout?.processingText);
  setText('#successTitle', site.checkout?.successTitle);
  setText('#successText', site.checkout?.successText);
  setText('#pushinPayNotice', site.checkout?.pushinPayNotice || '');
  $('#benefits').innerHTML = (site.profile.benefits || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function filterGallery(filter) {
  $$('.filter-button').forEach((button) => button.classList.toggle('active', button.dataset.filter === filter));
  $$('.gallery-tile').forEach((tile) => {
    const category = tile.dataset.category || 'all';
    tile.style.display = filter === 'all' || category.includes(filter) ? '' : 'none';
  });
}

function openCheckout(planId) {
  selectPlan(planId);
  showStep('plan');
  $('#checkoutModal').classList.add('active');
  $('#checkoutModal').setAttribute('aria-hidden', 'false');
}

function closeCheckout() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  $('#checkoutModal').classList.remove('active');
  $('#checkoutModal').setAttribute('aria-hidden', 'true');
}

function showStep(step) {
  $$('.checkout-step').forEach((el) => el.classList.remove('active'));
  $(`#step-${step}`).classList.add('active');
}

function customerPayload() {
  return {
    name: $('#customerName').value.trim(),
    email: $('#customerEmail').value.trim(),
    phone: $('#customerPhone').value.trim(),
    document: ''
  };
}

function validateCustomer(customer) {
  if (!customer.name || !customer.email || !customer.phone) {
    throw new Error('Preencha nome, email e WhatsApp para gerar o PIX.');
  }
  if (!customer.email.includes('@')) {
    throw new Error('Informe um email valido.');
  }
}

function utmPayload() {
  const params = new URLSearchParams(window.location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid', 'src'];
  return Object.fromEntries(keys.map((key) => [key, params.get(key) || '']).filter(([, value]) => value));
}

async function generatePix() {
  if (!selectedPlan) return;
  const customer = customerPayload();
  try {
    validateCustomer(customer);
  } catch (error) {
    toast(error.message);
    return;
  }
  showStep('generating');
  try {
    const response = await fetch('/api/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selectedPlan.id, customer, utm: utmPayload() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao gerar PIX.');
    $('#qrImage').src = data.qrImage;
    $('#pixCode').textContent = data.pixCode;
    setText('#chargePlanName', data.planName);
    setText('#chargePlanValue', brl(data.amount));
    showStep('payment');
    navigator.clipboard?.writeText(data.pixCode).then(() => toast('Codigo PIX copiado.'));
    startPolling(data.id);
  } catch (error) {
    showStep('account');
    toast(error.message || 'Erro ao gerar PIX.');
  }
}

function startPolling(id) {
  if (pollTimer) clearInterval(pollTimer);
  const check = async (manual = false) => {
    if (manual) setText('#autoCheckText', 'Verificando pagamento...');
    try {
      const response = await fetch(`/api/pix/status/${encodeURIComponent(id)}?t=${Date.now()}`);
      const data = await response.json();
      if (data.status === 'paid') {
        clearInterval(pollTimer);
        pollTimer = null;
        showStep('success');
      } else {
        setText('#autoCheckText', 'Detectando pagamento automaticamente...');
      }
    } catch {
      setText('#autoCheckText', 'Aguardando confirmacao...');
    }
  };
  check();
  pollTimer = setInterval(check, 3500);
  $('#verifyPaymentNow').onclick = () => check(true);
}

function bindUi() {
  $('#closeCheckout').addEventListener('click', closeCheckout);
  $('#checkoutModal').addEventListener('click', (event) => {
    if (event.target.id === 'checkoutModal') closeCheckout();
  });
  $('#continueCheckout').addEventListener('click', () => showStep('account'));
  $('#generatePix').addEventListener('click', generatePix);
  $('#copyPix').addEventListener('click', () => {
    const code = $('#pixCode').textContent.trim();
    navigator.clipboard?.writeText(code).then(() => toast('Codigo PIX copiado.'));
  });
  $('#accessNow').addEventListener('click', closeCheckout);
  const languageSwitcher = $('.language-switcher');
  const languageButton = $('#languageButton');
  if (languageSwitcher && languageButton) {
    languageButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = languageSwitcher.classList.toggle('open');
      languageButton.setAttribute('aria-expanded', String(open));
    });
    $$('[data-lang-option]').forEach((option) => {
      option.addEventListener('click', (event) => {
        event.stopPropagation();
        localStorage.setItem(LANGUAGE_KEY, option.dataset.langOption || 'pt-BR');
        languageSwitcher.classList.remove('open');
        languageButton.setAttribute('aria-expanded', 'false');
        applyLanguage();
        renderPlans();
      });
    });
    document.addEventListener('click', () => {
      languageSwitcher.classList.remove('open');
      languageButton.setAttribute('aria-expanded', 'false');
    });
  }
  $$('.tab-button').forEach((button) => button.addEventListener('click', () => {
    $$('.tab-button').forEach((item) => item.classList.toggle('active', item === button));
    if (button.dataset.tab === 'media') {
      document.querySelector('.gallery-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }));
  $$('.filter-button').forEach((button) => button.addEventListener('click', () => filterGallery(button.dataset.filter || 'all')));
}

async function init() {
  bindUi();
  const response = await fetch('/api/site');
  site = await response.json();
  applyLanguage();
  renderProfile();
  renderPlans();
  renderGallery();
  renderCheckoutCopy();
  applyLanguage();
}

init().catch((error) => {
  console.error(error);
  toast('Erro ao carregar site.');
});
