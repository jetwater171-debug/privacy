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
    ['♡', stats.likes],
    ['◉', stats.followers],
    ['▣', stats.comments],
    ['↗', stats.views]
  ].map(([icon, value]) => `<span class="stat-item">${icon} ${value || 0}</span>`).join('');

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
  const featured = plan.featured ? ' featured' : '';
  return `
    <button class="${className}${featured}" data-plan-id="${plan.id}" type="button">
      <span class="plan-name">${plan.name}${plan.featured ? ' <em class="best-choice">MELHOR ESCOLHA</em>' : ''}</span>
      <span class="plan-price">
        ${plan.oldPrice ? `<span class="strike">${brl(plan.oldPrice)}</span>` : ''}
        ${plan.discount ? `<span class="discount">${plan.discount}</span>` : ''}
        <strong>${brl(plan.price)}</strong>
      </span>
    </button>`;
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
  setImage('#previewImage', preview?.src || '');
  $('#gallery').innerHTML = (site.gallery || []).map((item) => `
    <button class="gallery-tile" data-open-checkout data-category="${item.category || 'all'}" data-type="${item.type || 'photo'}" type="button">
      <img src="${item.src}" alt="${item.title || 'Midia exclusiva'}" loading="lazy">
    </button>
  `).join('');
  $$('[data-open-checkout]').forEach((el) => el.addEventListener('click', () => openCheckout(selectedPlan?.id)));
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
