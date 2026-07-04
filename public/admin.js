let site = null;
let meta = null;
let uploadTarget = null;
let cachedLeads = [];
let cropState = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 2200);
}

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function getPath(obj, path) {
  return String(path).split('.').reduce((acc, key) => acc?.[key], obj);
}

function setPath(obj, path, value) {
  const parts = String(path).split('.');
  const last = parts.pop();
  let target = obj;
  for (const part of parts) {
    target[part] ||= {};
    target = target[part];
  }
  target[last] = value;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro na operacao.');
  return data;
}

function readBoundFields() {
  $$('[data-bind]').forEach((input) => {
    setPath(site, input.dataset.bind, input.value);
  });
}

function bindFields() {
  $$('[data-bind]').forEach((input) => {
    input.value = getPath(site, input.dataset.bind) ?? '';
  });
  $('#adminModelName').textContent = site.profile.name || 'Modelo';
}

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#adminApp').classList.remove('hidden');
}

function showLogin() {
  $('#loginView').classList.remove('hidden');
  $('#adminApp').classList.add('hidden');
}

async function loadAdmin() {
  await api('/api/admin/me');
  [site, meta] = await Promise.all([
    api('/api/admin/site'),
    api('/api/admin/meta')
  ]);
  showApp();
  renderAll();
}

function renderAll() {
  bindFields();
  renderBenefits();
  renderPlans();
  renderGallery();
  renderGateways();
  loadSales();
  loadLeads();
}

function renderBenefits() {
  $('#benefitsEditor').innerHTML = (site.profile.benefits || []).map((item, index) => `
    <div class="editor-item" data-benefit-index="${index}">
      <div class="editor-item-header"><strong>Beneficio ${index + 1}</strong><button class="remove-button" data-remove-benefit="${index}" type="button">Remover</button></div>
      <input data-benefit-value="${index}" type="text" value="${escapeHtml(item)}">
    </div>
  `).join('');
}

function renderPlans() {
  $('#plansEditor').innerHTML = (site.plans || []).map((plan, index) => `
    <article class="editor-item" data-plan-index="${index}">
      <div class="editor-item-header">
        <strong>${escapeHtml(plan.name || `Plano ${index + 1}`)}</strong>
        <div class="editor-actions">
          <button class="remove-button" data-remove-plan="${index}" type="button">Remover</button>
        </div>
      </div>
      <div class="admin-grid four">
        <label>ID<input data-plan-field="${index}:id" type="text" value="${escapeHtml(plan.id)}"></label>
        <label>Nome<input data-plan-field="${index}:name" type="text" value="${escapeHtml(plan.name)}"></label>
        <label>Preco<input data-plan-field="${index}:price" type="number" step="0.01" value="${Number(plan.price || 0)}"></label>
        <label>Preco antigo<input data-plan-field="${index}:oldPrice" type="number" step="0.01" value="${plan.oldPrice || ''}"></label>
        <label>Desconto<input data-plan-field="${index}:discount" type="text" value="${escapeHtml(plan.discount || '')}"></label>
        <label>Dias de acesso<input data-plan-field="${index}:durationDays" type="number" value="${Number(plan.durationDays || 0)}"></label>
        <label>Ativo<select data-plan-field="${index}:active"><option value="true" ${plan.active !== false ? 'selected' : ''}>Sim</option><option value="false" ${plan.active === false ? 'selected' : ''}>Nao</option></select></label>
        <label>Destaque<select data-plan-field="${index}:featured"><option value="false" ${!plan.featured ? 'selected' : ''}>Nao</option><option value="true" ${plan.featured ? 'selected' : ''}>Sim</option></select></label>
      </div>
    </article>
  `).join('');
}

function renderGallery() {
  $('#galleryEditor').innerHTML = (site.gallery || []).map((item, index) => `
    <article class="editor-item" data-media-index="${index}">
      <div class="editor-item-header">
        <strong>${escapeHtml(item.title || `Midia ${index + 1}`)}</strong>
        <div class="editor-actions">
          <button class="secondary-button" data-upload-target="gallery.${index}.src" type="button">Enviar arquivo</button>
          <button class="remove-button" data-remove-media="${index}" type="button">Remover</button>
        </div>
      </div>
      <div class="admin-grid four">
        <label>ID<input data-media-field="${index}:id" type="text" value="${escapeHtml(item.id)}"></label>
        <label>Titulo<input data-media-field="${index}:title" type="text" value="${escapeHtml(item.title || '')}"></label>
        <label>Tipo<select data-media-field="${index}:type"><option value="photo" ${item.type === 'photo' ? 'selected' : ''}>Foto</option><option value="video" ${item.type === 'video' ? 'selected' : ''}>Video</option><option value="preview" ${item.type === 'preview' ? 'selected' : ''}>Preview</option></select></label>
        <label>Categoria<input data-media-field="${index}:category" type="text" value="${escapeHtml(item.category || 'all')}"></label>
      </div>
      <label>Imagem/video<input data-media-field="${index}:src" type="text" value="${escapeHtml(item.src || '')}"></label>
    </article>
  `).join('');
}

function renderGateways() {
  $('#gatewayOrder').value = (site.payments.gatewayOrder || []).join(',');
  const gateways = meta.gateways || {};
  $('#gatewayEditor').innerHTML = Object.entries(gateways).map(([id, gateway]) => {
    const cfg = site.payments.gateways?.[id] || {};
    const fields = (gateway.fields || []).map((field) => fieldMarkup(id, field, cfg[field.key])).join('');
    return `
      <article class="gateway-card">
        <header class="gateway-card-header">
          <div>
            <strong>${gateway.label}</strong>
            <span>${id}</span>
          </div>
          <label class="switch-line">Ativo <input data-gateway-field="${id}:enabled" type="checkbox" ${cfg.enabled ? 'checked' : ''}></label>
        </header>
        <div class="admin-grid two">${fields}</div>
      </article>`;
  }).join('');
}

function fieldMarkup(gatewayId, field, value) {
  if (field.type === 'select') {
    return `<label>${field.label}<select data-gateway-field="${gatewayId}:${field.key}">${(field.options || []).map((option) => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('')}</select></label>`;
  }
  return `<label>${field.label}<input data-gateway-field="${gatewayId}:${field.key}" type="${field.type || 'text'}" placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(value || '')}"></label>`;
}

function readEditors() {
  readBoundFields();
  site.profile.benefits = $$('[data-benefit-value]').map((input) => input.value.trim()).filter(Boolean);
  $$('[data-plan-field]').forEach((input) => {
    const [index, field] = input.dataset.planField.split(':');
    site.plans[Number(index)][field] = coerceField(field, input.value);
  });
  $$('[data-media-field]').forEach((input) => {
    const [index, field] = input.dataset.mediaField.split(':');
    site.gallery[Number(index)][field] = input.value;
  });
  site.payments.gatewayOrder = $('#gatewayOrder').value.split(',').map((item) => item.trim()).filter(Boolean);
  $$('[data-gateway-field]').forEach((input) => {
    const [gateway, field] = input.dataset.gatewayField.split(':');
    site.payments.gateways[gateway] ||= {};
    site.payments.gateways[gateway][field] = input.type === 'checkbox' ? input.checked : coerceField(field, input.value);
  });
}

function coerceField(field, value) {
  if (['price', 'oldPrice'].includes(field)) return value === '' ? '' : Number(value || 0);
  if (field === 'durationDays' || field === 'autoApproveSeconds') return Number(value || 0);
  if (field === 'active' || field === 'featured') return value === true || value === 'true';
  return value;
}

async function saveAll() {
  readEditors();
  const data = await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(site) });
  site = data.site;
  renderAll();
  toast('Alteracoes salvas.');
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/admin/upload', { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha no upload.');
  setPath(site, uploadTarget, data.url);
  renderAll();
  toast('Arquivo enviado.');
}

function cropPresetForTarget(target) {
  if (target === 'profile.avatar' || target === 'profile.verifiedIcon') return { aspect: 1, width: 720, height: 720, hint: 'Use o rosto bem centralizado. Ideal para avatar e selo.' };
  if (target === 'profile.banner') return { aspect: 2.857, width: 1600, height: 560, hint: 'Use uma imagem larga. O banner do site corta bem no formato horizontal.' };
  if (target === 'profile.logo') return { aspect: 4.8, width: 960, height: 200, hint: 'Deixe o logo centralizado e com respiro nas laterais.' };
  if (String(target || '').startsWith('gallery.')) {
    const index = Number(String(target).split('.')[1]);
    const item = site.gallery?.[index] || {};
    if (item.type === 'preview') return { aspect: 0.5625, width: 900, height: 1600, hint: 'Preview vertical para o post bloqueado.' };
    return { aspect: 0.8, width: 840, height: 1050, hint: 'Formato vertical 4:5, igual aos cards do site.' };
  }
  return { aspect: 1, width: 900, height: 900, hint: 'Ajuste o corte para o tamanho desejado.' };
}

function openCropper(file) {
  const preset = cropPresetForTarget(uploadTarget);
  cropState = {
    file,
    preset,
    url: URL.createObjectURL(file),
    image: new Image(),
    baseWidth: 0,
    baseHeight: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0
  };
  $('#cropHint').textContent = preset.hint;
  setCropSize(preset.width, preset.height);
  $('#cropZoom').value = '1';
  $('#cropImage').src = cropState.url;
  cropState.image.onload = () => {
    $('#cropModal').classList.add('active');
    $('#cropModal').setAttribute('aria-hidden', 'false');
    requestAnimationFrame(fitCropImage);
  };
  cropState.image.src = cropState.url;
}

function setCropAspectValue(aspect) {
  const select = $('#cropAspect');
  const value = String(aspect);
  const existing = Array.from(select.options).find((option) => Math.abs(Number(option.value) - Number(aspect)) < 0.001 && option.id !== 'cropCustomAspect');
  if (existing) {
    select.value = existing.value;
  } else {
    $('#cropCustomAspect').value = value;
    select.value = value;
  }
}

function currentCropAspect() {
  const width = Math.max(120, Number($('#cropWidth').value || cropState?.preset?.width || 120));
  const height = Math.max(120, Number($('#cropHeight').value || cropState?.preset?.height || 120));
  return width / height;
}

function setCropSize(width, height) {
  const safeWidth = Math.max(120, Math.round(Number(width || 120)));
  const safeHeight = Math.max(120, Math.round(Number(height || 120)));
  $('#cropWidth').value = safeWidth;
  $('#cropHeight').value = safeHeight;
  const aspect = safeWidth / safeHeight;
  setCropAspectValue(aspect);
  $('#cropStage').style.setProperty('--crop-aspect', aspect);
}

function setCropWidthKeepingAspect(width) {
  const aspect = currentCropAspect();
  const safeWidth = Math.max(120, Math.round(Number(width || 120)));
  setCropSize(safeWidth, safeWidth / aspect);
}

function setCropHeightKeepingAspect(height) {
  const aspect = currentCropAspect();
  const safeHeight = Math.max(120, Math.round(Number(height || 120)));
  setCropSize(safeHeight * aspect, safeHeight);
}

function closeCropper() {
  if (cropState?.url) URL.revokeObjectURL(cropState.url);
  cropState = null;
  $('#cropModal').classList.remove('active');
  $('#cropModal').setAttribute('aria-hidden', 'true');
  $('#cropImage').removeAttribute('src');
}

function cropStageRect() {
  return $('#cropStage').getBoundingClientRect();
}

function fitCropImage() {
  if (!cropState) return;
  const rect = cropStageRect();
  if (!rect.width || !rect.height) return;
  const imageRatio = cropState.image.naturalWidth / cropState.image.naturalHeight;
  const stageRatio = rect.width / rect.height;
  if (imageRatio > stageRatio) {
    cropState.baseHeight = rect.height;
    cropState.baseWidth = rect.height * imageRatio;
  } else {
    cropState.baseWidth = rect.width;
    cropState.baseHeight = rect.width / imageRatio;
  }
  cropState.zoom = Number($('#cropZoom').value || 1);
  cropState.offsetX = 0;
  cropState.offsetY = 0;
  applyCropTransform();
}

function constrainCropOffset() {
  const rect = cropStageRect();
  const width = cropState.baseWidth * cropState.zoom;
  const height = cropState.baseHeight * cropState.zoom;
  const maxX = Math.max(0, (width - rect.width) / 2);
  const maxY = Math.max(0, (height - rect.height) / 2);
  cropState.offsetX = Math.min(maxX, Math.max(-maxX, cropState.offsetX));
  cropState.offsetY = Math.min(maxY, Math.max(-maxY, cropState.offsetY));
}

function applyCropTransform() {
  if (!cropState) return;
  constrainCropOffset();
  const img = $('#cropImage');
  img.style.width = `${cropState.baseWidth}px`;
  img.style.height = `${cropState.baseHeight}px`;
  img.style.transform = `translate(calc(-50% + ${cropState.offsetX}px), calc(-50% + ${cropState.offsetY}px)) scale(${cropState.zoom})`;
}

async function uploadCroppedImage() {
  if (!cropState) return;
  const rect = cropStageRect();
  const outputWidth = Math.max(120, Math.round(Number($('#cropWidth').value || cropState.preset.width)));
  const outputHeight = Math.max(120, Math.round(Number($('#cropHeight').value || cropState.preset.height)));
  const displayWidth = cropState.baseWidth * cropState.zoom;
  const displayHeight = cropState.baseHeight * cropState.zoom;
  const left = rect.width / 2 + cropState.offsetX - displayWidth / 2;
  const top = rect.height / 2 + cropState.offsetY - displayHeight / 2;
  const sx = Math.max(0, (-left / displayWidth) * cropState.image.naturalWidth);
  const sy = Math.max(0, (-top / displayHeight) * cropState.image.naturalHeight);
  const sw = Math.min(cropState.image.naturalWidth - sx, (rect.width / displayWidth) * cropState.image.naturalWidth);
  const sh = Math.min(cropState.image.naturalHeight - sy, (rect.height / displayHeight) * cropState.image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cropState.image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
  if (!blob) throw new Error('Nao foi possivel cortar a imagem.');
  const filename = `${(cropState.file.name || 'imagem').replace(/\.[^.]+$/, '')}-crop.webp`;
  closeCropper();
  await uploadFile(new File([blob], filename, { type: 'image/webp' }));
}

async function testGateways() {
  readEditors();
  $('#gatewayTestResult').textContent = 'Testando...';
  try {
    const data = await api('/api/admin/gateways/test', {
      method: 'POST',
      body: JSON.stringify({
        amount: $('#gatewayTestAmount').value,
        gateways: site.payments.gatewayOrder
      })
    });
    $('#gatewayTestResult').textContent = JSON.stringify(data.results, null, 2);
  } catch (error) {
    $('#gatewayTestResult').textContent = error.message;
  }
}

async function loadSales() {
  try {
    const data = await api('/api/admin/transactions');
    renderMetrics(data.metrics || {});
    renderTransactions(data.transactions || []);
  } catch {
    renderMetrics({});
    renderTransactions([]);
  }
}

async function loadLeads() {
  try {
    const data = await api('/api/admin/leads');
    cachedLeads = data.leads || [];
    renderLeadMetrics(cachedLeads);
    renderLeads(cachedLeads);
  } catch {
    cachedLeads = [];
    renderLeadMetrics([]);
    renderLeads([]);
  }
}

function filteredLeads() {
  const query = ($('#leadSearch')?.value || '').trim().toLowerCase();
  const status = $('#leadStatusFilter')?.value || 'all';
  return cachedLeads.filter((lead) => {
    const statusOk = status === 'all' || lead.status === status;
    const haystack = [
      lead.id,
      lead.transactionId,
      lead.gateway,
      lead.planName,
      lead.status,
      lead.customer?.name,
      lead.customer?.email,
      lead.customer?.phone_number,
      lead.customer?.document,
      lead.utm?.utm_source,
      lead.utm?.utm_campaign,
      lead.utm?.utm_content,
      lead.utm?.src
    ].join(' ').toLowerCase();
    return statusOk && (!query || haystack.includes(query));
  });
}

function renderLeadMetrics(leads) {
  const total = leads.length;
  const paid = leads.filter((lead) => lead.status === 'paid').length;
  const pending = leads.filter((lead) => lead.status === 'pending').length;
  const revenue = leads.filter((lead) => lead.status === 'paid').reduce((sum, lead) => sum + Number(lead.amountCents || 0), 0) / 100;
  const conversion = total ? Math.round((paid / total) * 100) : 0;
  $('#leadMetricCards').innerHTML = [
    ['Leads gerados', total],
    ['Pagos', paid],
    ['Aguardando', pending],
    ['Conversao', `${conversion}%`],
    ['Receita paga', brl(revenue)]
  ].map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

function renderLeads() {
  const leads = filteredLeads();
  if (!leads.length) {
    $('#leadsTable').innerHTML = '<p class="muted">Nenhum lead encontrado.</p>';
    return;
  }
  $('#leadsTable').innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Status</th><th>Lead</th><th>Plano</th><th>Valor</th><th>Gateway</th><th>Origem</th><th>Pago em</th></tr></thead>
      <tbody>
        ${leads.map((lead) => `
          <tr>
            <td>${new Date(lead.createdAt).toLocaleString('pt-BR')}</td>
            <td><span class="status-pill status-${escapeHtml(lead.status)}">${lead.status === 'paid' ? 'pago' : 'gerado'}</span></td>
            <td><strong>${escapeHtml(lead.customer?.name || 'Cliente')}</strong><br><small>${escapeHtml(lead.customer?.email || '')}<br>${escapeHtml(lead.customer?.phone_number || '')}</small></td>
            <td>${escapeHtml(lead.planName || '')}</td>
            <td>${brl(Number(lead.amountCents || 0) / 100)}</td>
            <td>${escapeHtml(lead.gateway || '')}</td>
            <td><small>${escapeHtml(lead.utm?.utm_source || lead.utm?.src || '-')}<br>${escapeHtml(lead.utm?.utm_campaign || '')}</small></td>
            <td>${lead.paidAt ? new Date(lead.paidAt).toLocaleString('pt-BR') : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function renderMetrics(metrics) {
  const order = site.payments.gatewayOrder || Object.keys(meta.gateways || {});
  $('#metricCards').innerHTML = order.map((gateway) => {
    const item = metrics[gateway] || {};
    const generated = Number(item.generated || 0);
    const paid = Number(item.paid || 0);
    const conversion = generated ? Math.round((paid / generated) * 100) : 0;
    return `<article class="metric-card"><span>${gateway}</span><strong>${conversion}%</strong><small>${paid} pagos / ${generated} PIX</small></article>`;
  }).join('');
}

function renderTransactions(transactions) {
  if (!transactions.length) {
    $('#transactionsTable').innerHTML = '<p class="muted">Nenhuma venda ainda.</p>';
    return;
  }
  $('#transactionsTable').innerHTML = `
    <table>
      <thead><tr><th>Data</th><th>Plano</th><th>Valor</th><th>Gateway</th><th>Status</th><th>Cliente</th><th>Acoes</th></tr></thead>
      <tbody>
        ${transactions.map((tx) => `
          <tr>
            <td>${new Date(tx.createdAt).toLocaleString('pt-BR')}</td>
            <td>${escapeHtml(tx.planName)}</td>
            <td>${brl(Number(tx.amountCents || 0) / 100)}</td>
            <td>${escapeHtml(tx.gateway)}</td>
            <td><span class="status-pill status-${escapeHtml(tx.status)}">${escapeHtml(tx.status)}</span></td>
            <td>${escapeHtml(tx.customer?.email || tx.customer?.name || '')}</td>
            <td>${tx.status !== 'paid' ? `<button class="secondary-button" data-mark-paid="${tx.id}" type="button">Marcar pago</button>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function bindEvents() {
  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('#adminPassword').value }) });
      await loadAdmin();
    } catch (error) {
      toast(error.message);
    }
  });

  $('#logout').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST', body: JSON.stringify({}) }).catch(() => {});
    showLogin();
  });

  $$('.admin-nav').forEach((button) => button.addEventListener('click', () => {
    $$('.admin-nav').forEach((item) => item.classList.toggle('active', item === button));
    $$('.admin-section').forEach((section) => section.classList.toggle('active', section.id === `section-${button.dataset.section}`));
    $('#sectionTitle').textContent = button.textContent;
    if (button.dataset.section === 'sales') loadSales();
    if (button.dataset.section === 'leads') loadLeads();
  }));

  $('#saveAll').addEventListener('click', () => saveAll().catch((error) => toast(error.message)));
  $('#changePassword').addEventListener('click', async () => {
    const password = $('#newAdminPassword').value;
    try {
      await api('/api/admin/password', { method: 'POST', body: JSON.stringify({ password }) });
      $('#newAdminPassword').value = '';
      toast('Senha atualizada.');
    } catch (error) {
      toast(error.message);
    }
  });
  $('#addBenefit').addEventListener('click', () => {
    site.profile.benefits ||= [];
    site.profile.benefits.push('Novo beneficio');
    renderBenefits();
  });
  $('#addPlan').addEventListener('click', () => {
    site.plans.push({ id: `plan_${Date.now()}`, name: 'Novo plano', price: 19.9, oldPrice: '', discount: '', durationDays: 30, featured: false, active: true });
    renderPlans();
  });
  $('#addMedia').addEventListener('click', () => {
    site.gallery.push({ id: `media_${Date.now()}`, title: 'Nova midia', type: 'photo', category: 'all photos', src: '' });
    renderGallery();
  });
  $('#testGateways').addEventListener('click', testGateways);
  $('#refreshLeads').addEventListener('click', loadLeads);
  $('#leadSearch').addEventListener('input', () => renderLeads());
  $('#leadStatusFilter').addEventListener('change', () => renderLeads());

  document.body.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.removeBenefit) {
      site.profile.benefits.splice(Number(target.dataset.removeBenefit), 1);
      renderBenefits();
    }
    if (target.dataset.removePlan) {
      site.plans.splice(Number(target.dataset.removePlan), 1);
      renderPlans();
    }
    if (target.dataset.removeMedia) {
      site.gallery.splice(Number(target.dataset.removeMedia), 1);
      renderGallery();
    }
    if (target.dataset.uploadTarget) {
      readEditors();
      uploadTarget = target.dataset.uploadTarget;
      $('#uploadInput').click();
    }
    if (target.dataset.markPaid) {
      await api(`/api/admin/transactions/${target.dataset.markPaid}/mark-paid`, { method: 'POST', body: JSON.stringify({}) });
      await loadSales();
      toast('Venda marcada como paga.');
    }
  });

  $('#uploadInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !uploadTarget) return;
    try {
      if (file.type.startsWith('image/')) openCropper(file);
      else await uploadFile(file);
    } catch (error) {
      toast(error.message);
    }
  });

  $('#closeCrop').addEventListener('click', closeCropper);
  $('#uploadOriginal').addEventListener('click', async () => {
    if (!cropState) return;
    const file = cropState.file;
    closeCropper();
    await uploadFile(file).catch((error) => toast(error.message));
  });
  $('#applyCrop').addEventListener('click', () => uploadCroppedImage().catch((error) => toast(error.message)));
  $('#cropAspect').addEventListener('change', () => {
    if (!cropState) return;
    const aspect = Number($('#cropAspect').value || 1);
    const width = Math.max(120, Number($('#cropWidth').value || cropState.preset.width));
    setCropSize(width, width / aspect);
    requestAnimationFrame(fitCropImage);
  });
  $('#cropWidth').addEventListener('change', () => {
    if (!cropState) return;
    setCropWidthKeepingAspect($('#cropWidth').value);
    requestAnimationFrame(fitCropImage);
  });
  $('#cropHeight').addEventListener('change', () => {
    if (!cropState) return;
    setCropHeightKeepingAspect($('#cropHeight').value);
    requestAnimationFrame(fitCropImage);
  });
  $('#cropZoom').addEventListener('input', () => {
    if (!cropState) return;
    cropState.zoom = Number($('#cropZoom').value || 1);
    applyCropTransform();
  });
  $('#cropStage').addEventListener('pointerdown', (event) => {
    if (!cropState) return;
    cropState.dragging = true;
    cropState.startX = event.clientX;
    cropState.startY = event.clientY;
    cropState.startOffsetX = cropState.offsetX;
    cropState.startOffsetY = cropState.offsetY;
    $('#cropStage').setPointerCapture(event.pointerId);
  });
  $('#cropStage').addEventListener('pointermove', (event) => {
    if (!cropState?.dragging) return;
    cropState.offsetX = cropState.startOffsetX + event.clientX - cropState.startX;
    cropState.offsetY = cropState.startOffsetY + event.clientY - cropState.startY;
    applyCropTransform();
  });
  $('#cropStage').addEventListener('pointerup', () => {
    if (cropState) cropState.dragging = false;
  });
}

bindEvents();
loadAdmin().catch(() => showLogin());
