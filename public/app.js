let site = null;
let selectedPlan = null;
let pollTimer = null;
let liveSeconds = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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
  if (el) el.textContent = value || '';
}

function setImage(selector, src) {
  const el = $(selector);
  if (el) el.src = src || '';
}

function setBackground(selector, src) {
  const el = $(selector);
  if (el) el.style.backgroundImage = src ? `url("${src}")` : '';
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
  setBackground('#banner', site.profile.banner);
  setBackground('#checkoutBanner', site.profile.banner);
  setText('#profileName', site.profile.name);
  setText('#feedName', site.profile.name);
  setText('#checkoutName', site.profile.name);
  setText('#handle', site.profile.handle);
  setText('#feedHandle', site.profile.handle);
  setText('#checkoutHandle', site.profile.handle);
  setText('#bio', site.profile.bio);
  setText('#location', site.profile.location);
  setText('#legalNotice', site.profile.legalNotice);
  setText('#postsCount', site.profile.stats?.posts || '0');
  setText('#mediaCount', site.profile.stats?.media || '0');
  $('#instagram').href = site.profile.instagram || '#';
  $('#threads').href = site.profile.threads || '#';

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
  $('#checkoutPlans').innerHTML = plans.map((plan) => planButton(plan, 'checkout-plan')).join('');
  $$('.plan-button').forEach((button) => button.addEventListener('click', () => openCheckout(button.dataset.planId)));
  $$('.checkout-plan').forEach((button) => button.addEventListener('click', () => selectPlan(button.dataset.planId)));
  selectPlan(selectedPlan?.id);
}

function planButton(plan, className) {
  return privacyPlanButton(plan, className);
}

function privacyPlanButton(plan, className) {
  const featured = plan.featured ? ' featured' : '';
  const subscriptionClass = className === 'plan-button' ? ' subscription-plan-button' : '';
  return `
    <button class="${className}${subscriptionClass}${featured}" data-plan-id="${escapeHtml(plan.id)}" type="button">
      ${plan.featured ? '<span class="best-choice">MELHOR ESCOLHA</span>' : ''}
      <span class="plan-name">${escapeHtml(plan.name)}</span>
      <span class="plan-price plan-price-wrap">
        ${plan.oldPrice || plan.discount ? `<span class="strike-stack">${plan.discount ? `<span class="discount plan-discount">${escapeHtml(plan.discount)}</span>` : ''}${plan.oldPrice ? `<span class="strike">${brl(plan.oldPrice)}</span>` : ''}</span>` : ''}
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

function selectPlan(planId) {
  const plan = (site.plans || []).find((item) => item.id === planId) || (site.plans || [])[0];
  if (!plan) return;
  selectedPlan = plan;
  $$('.checkout-plan').forEach((button) => button.classList.toggle('active', button.dataset.planId === plan.id));
  setText('#selectedPlanCopy', plan.durationDays > 0 ? `Tenha acesso por ${plan.name.toLowerCase()}` : 'Pacote vitalicio: acesso permanente');
  setText('#selectedPlanPrice', brl(plan.price));
  setText('#chargePlanName', plan.name);
  setText('#chargePlanValue', brl(plan.price));
}

function renderGallery() {
  const preview = (site.gallery || []).find((item) => item.type === 'preview') || (site.gallery || [])[0];
  const gallery = site.gallery || [];
  const mosaicItems = gallery.filter((item) => item.id !== preview?.id).slice(0, 3);
  const postCard = $('.locked-post');
  if (postCard) {
    postCard.innerHTML = `
      <header class="feed-head">
        <div class="feed-profile">
          <img src="${escapeHtml(site.profile.avatar)}" alt="Avatar">
          <div>
            <strong>${escapeHtml(site.profile.name)}${site.profile.verifiedIcon ? `<img class="feed-verified-icon" src="${escapeHtml(site.profile.verifiedIcon)}" alt="Verificado">` : ''}</strong>
            <span>${escapeHtml(site.profile.handle)}</span>
          </div>
        </div>
        <button class="dots" type="button" aria-label="Mais opcoes">&#8942;</button>
      </header>
      <div class="post-mosaic">
        ${mosaicItems.map((item, index) => lockedMediaMarkup(item, index === 0 ? 'wide' : '')).join('')}
      </div>
      <div class="post-actions" aria-hidden="true">
        <span>&#9825;</span>
        <span>&#9675;</span>
        <span>$</span>
        <span>&#9633;</span>
      </div>`;
  }
  setImage('#previewImage', preview?.src || '');
  $('#gallery').innerHTML = gallery.map((item) => `
    <button class="gallery-tile" data-open-checkout data-category="${item.category || 'all'}" data-type="${item.type || 'photo'}" type="button">
      <img src="${item.src}" alt="${item.title || 'Midia exclusiva'}" loading="lazy">
      <span class="tile-lock" aria-hidden="true"></span>
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
    document: $('#customerDocument').value.trim()
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
    showStep('plan');
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
  $('#generatePix').addEventListener('click', generatePix);
  $('#copyPix').addEventListener('click', () => {
    const code = $('#pixCode').textContent.trim();
    navigator.clipboard?.writeText(code).then(() => toast('Codigo PIX copiado.'));
  });
  $('#accessNow').addEventListener('click', closeCheckout);
  $$('.filter-button').forEach((button) => button.addEventListener('click', () => filterGallery(button.dataset.filter || 'all')));
}

async function init() {
  bindUi();
  const response = await fetch('/api/site');
  site = await response.json();
  renderProfile();
  renderPlans();
  renderGallery();
  renderCheckoutCopy();
}

init().catch((error) => {
  console.error(error);
  toast('Erro ao carregar site.');
});
