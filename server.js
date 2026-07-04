const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'site.json');
const SESSION_COOKIE = 'privacy_admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SECRET = process.env.ADMIN_SESSION_SECRET || crypto.createHash('sha256').update(`${ROOT}:privacy-admin`).digest('hex');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const SUPABASE_BUCKET = String(process.env.SUPABASE_STORAGE_BUCKET || 'privacy-assets');
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const GATEWAYS = {
  sync: {
    label: 'Sync Demo',
    fields: [
      { key: 'autoApproveSeconds', label: 'Aprovar automaticamente apos X segundos', type: 'number', placeholder: '0' }
    ]
  },
  pushinpay: {
    label: 'PushinPay',
    fields: [
      { key: 'environment', label: 'Ambiente', type: 'select', options: ['production', 'sandbox'] },
      { key: 'token', label: 'Bearer token', type: 'password' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url' }
    ]
  },
  atomopay: {
    label: 'AtomoPay',
    fields: [
      { key: 'apiToken', label: 'API token', type: 'password' },
      { key: 'offerHash', label: 'Offer hash', type: 'text' },
      { key: 'productHash', label: 'Product hash', type: 'text' },
      { key: 'postbackUrl', label: 'Postback URL', type: 'url' }
    ]
  },
  bravopay: {
    label: 'Bravo Pay',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'password' },
      { key: 'webhookSecret', label: 'Webhook secret', type: 'password' },
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://bravopay.club/api/v1' }
    ]
  }
};

const DEFAULT_SITE = {
  admin: {
    passwordHash: hashPassword('Leo12345!')
  },
  profile: {
    siteTitle: 'Privacy Luiza Avila',
    logo: '/uploads/seed/logoBarra.webp',
    banner: '/uploads/seed/banner.webp',
    avatar: '/uploads/seed/avatar.webp',
    verifiedIcon: '/uploads/seed/verified.webp',
    name: 'Luiza Avila',
    handle: '@luiza_avilah',
    bio: 'Oi, amores! Estou super animada por comecar essa jornada incrivel com voces no meu Privacy!\nConteudos exclusivos, videos que ja gravei com algumas amigas, ex-namorados e ate minha rotina durante o banho.\nTe espero aqui!',
    location: 'Sorocaba, Sao Paulo',
    instagram: 'https://www.instagram.com/luiza_avilah/',
    threads: 'https://www.threads.net/@luiza_avilah',
    liveStart: '07:19',
    stats: {
      likes: '503',
      followers: '320',
      comments: '32',
      views: '86k',
      posts: '594',
      media: '647'
    },
    legalNotice: 'Todo e qualquer conteudo publicado neste perfil (fotos, videos, audios, textos e demais materiais) e propriedade exclusiva do produtor, nos termos da Lei 9.610/98 (Direitos Autorais).',
    benefits: [
      'Acesso ao conteudo exclusivo',
      'Chat exclusivo comigo',
      'Cancele a qualquer hora',
      'Sua chance de ter acesso a mim e me conhecer de verdade'
    ]
  },
  plans: [
    { id: 'one', name: '1 mes de acesso', price: 29.9, oldPrice: '', discount: '', durationDays: 30, featured: false, active: true },
    { id: 'three', name: '3 meses de acesso', price: 45.9, oldPrice: 89.9, discount: '50% OFF', durationDays: 90, featured: false, active: true },
    { id: 'lifetime', name: 'ACESSO VITALICIO', price: 54.9, oldPrice: 299.5, discount: '80% OFF', durationDays: 0, featured: true, active: true }
  ],
  gallery: [
    { id: 'preview', type: 'preview', category: 'all photos', src: '/uploads/seed/preview.webp', title: 'Preview bloqueado' },
    { id: 'top1', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-top-01-thumb.webp', title: 'Previa exclusiva 1' },
    { id: 'top2', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-top-02-thumb.webp', title: 'Previa exclusiva 2' },
    { id: 'top3', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-top-03-thumb.webp', title: 'Previa exclusiva 3' },
    { id: 'top4', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-top-04-thumb.webp', title: 'Previa exclusiva 4' },
    { id: 'photo1', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-photo-1-thumb.webp', title: 'Foto exclusiva 1' },
    { id: 'photo2', type: 'photo', category: 'all photos', src: '/uploads/seed/gallery-photo-2-thumb.webp', title: 'Foto exclusiva 2' },
    { id: 'for1', type: 'photo', category: 'all foryou photos', src: '/uploads/seed/foryou-1-thumb.webp', title: 'Para voce especial 1' },
    { id: 'for2', type: 'photo', category: 'all foryou photos', src: '/uploads/seed/foryou-2-thumb.webp', title: 'Para voce especial 2' },
    { id: 'for3', type: 'photo', category: 'all foryou photos', src: '/uploads/seed/foryou-3-thumb.webp', title: 'Para voce especial 3' },
    { id: 'video1', type: 'video', category: 'all videos', src: '/uploads/seed/video-1-thumb.webp', title: 'Video exclusivo 1' },
    { id: 'video2', type: 'video', category: 'all videos', src: '/uploads/seed/video-2-thumb.webp', title: 'Video exclusivo 2' },
    { id: 'video3', type: 'video', category: 'all videos', src: '/uploads/seed/video-3-thumb.webp', title: 'Video exclusivo 3' },
    { id: 'video4', type: 'video', category: 'all videos', src: '/uploads/seed/video-4-thumb.webp', title: 'Video exclusivo 4' }
  ],
  checkout: {
    headline: 'Tenha acesso a tudo isso:',
    accountTitle: 'Crie sua conta para acessar',
    buttonText: 'Gerar PIX',
    processingText: 'Estamos preparando seu acesso VIP seguro.',
    successTitle: 'PAGAMENTO CONFIRMADO',
    successText: 'Seu acesso foi liberado. Veja todo o conteudo aqui no site.',
    pushinPayNotice: 'A PUSHIN PAY atua exclusivamente como processadora de pagamentos e nao possui qualquer responsabilidade pela entrega, suporte, conteudo, qualidade ou cumprimento das obrigacoes relacionadas aos produtos ou servicos oferecidos pelo vendedor.'
  },
  payments: {
    gatewayOrder: ['sync', 'pushinpay', 'atomopay', 'bravopay'],
    gateways: {
      sync: { enabled: true, autoApproveSeconds: 0 },
      pushinpay: { enabled: false, environment: 'production', token: '', webhookUrl: '' },
      atomopay: { enabled: false, apiToken: '', offerHash: '', productHash: '', postbackUrl: '' },
      bravopay: { enabled: false, apiKey: '', webhookSecret: '', baseUrl: 'https://bravopay.club/api/v1' }
    },
    metrics: {}
  },
  leads: [],
  transactions: []
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) writeLocalDb(DEFAULT_SITE);
}

function readLocalDb() {
  ensureData();
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.leads ||= [];
  db.transactions ||= [];
  db.payments ||= DEFAULT_SITE.payments;
  db.payments.metrics ||= {};
  return db;
}

function writeLocalDb(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.body instanceof Buffer ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.hint || data?.code || response.statusText;
    throw new Error(`Supabase ${response.status}: ${message}`);
  }
  return data;
}

async function readDb() {
  if (!USE_SUPABASE) return readLocalDb();
  const rows = await supabaseRequest('/rest/v1/privacy_site_state?id=eq.default&select=data&limit=1', {
    headers: { Accept: 'application/json' }
  });
  if (Array.isArray(rows) && rows[0]?.data) {
    const db = { ...DEFAULT_SITE, ...rows[0].data };
    db.leads ||= [];
    db.transactions ||= [];
    db.payments ||= DEFAULT_SITE.payments;
    db.payments.metrics ||= {};
    return db;
  }
  await writeDb(DEFAULT_SITE);
  return structuredClone(DEFAULT_SITE);
}

async function writeDb(data) {
  if (!USE_SUPABASE) {
    writeLocalDb(data);
    return;
  }
  await supabaseRequest('/rest/v1/privacy_site_state?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: 'default', data, updated_at: new Date().toISOString() })
  });
}

function leadFromTransaction(tx, patch = {}) {
  return {
    id: tx.leadId || tx.id,
    transactionId: tx.id,
    externalId: tx.externalId || '',
    status: tx.status || 'pending',
    rawStatus: tx.rawStatus || tx.status || 'pending',
    gateway: tx.gateway || '',
    planId: tx.planId || '',
    planName: tx.planName || '',
    amountCents: Number(tx.amountCents || 0),
    customer: tx.customer || {},
    utm: tx.utm || {},
    ip: tx.ip || '',
    userAgent: tx.userAgent || '',
    createdAt: tx.createdAt || new Date().toISOString(),
    updatedAt: tx.updatedAt || new Date().toISOString(),
    paidAt: tx.paidAt || null,
    ...patch
  };
}

function upsertLocalLead(db, lead) {
  db.leads ||= [];
  const index = db.leads.findIndex((item) => item.id === lead.id || item.transactionId === lead.transactionId);
  if (index >= 0) db.leads[index] = { ...db.leads[index], ...lead };
  else db.leads.push(lead);
}

async function upsertLead(db, lead) {
  upsertLocalLead(db, lead);
  if (!USE_SUPABASE) return;
  await supabaseRequest('/rest/v1/privacy_leads?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: lead.id,
      transaction_id: lead.transactionId,
      external_id: lead.externalId,
      status: lead.status,
      raw_status: lead.rawStatus,
      gateway: lead.gateway,
      plan_id: lead.planId,
      plan_name: lead.planName,
      amount_cents: lead.amountCents,
      customer: lead.customer,
      utm: lead.utm,
      ip: lead.ip,
      user_agent: lead.userAgent,
      paid_at: lead.paidAt,
      created_at: lead.createdAt,
      updated_at: lead.updatedAt
    })
  });
}

async function listLeads(db) {
  if (!USE_SUPABASE) return [...(db.leads || [])].reverse().slice(0, 1000);
  const rows = await supabaseRequest('/rest/v1/privacy_leads?select=*&order=created_at.desc&limit=1000', {
    headers: { Accept: 'application/json' }
  });
  return (rows || []).map((row) => ({
    id: row.id,
    transactionId: row.transaction_id,
    externalId: row.external_id,
    status: row.status,
    rawStatus: row.raw_status,
    gateway: row.gateway,
    planId: row.plan_id,
    planName: row.plan_name,
    amountCents: row.amount_cents,
    customer: row.customer || {},
    utm: row.utm || {},
    ip: row.ip || '',
    userAgent: row.user_agent || '',
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

function publicSite(db) {
  const { admin, transactions, leads, ...site } = db;
  return site;
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function requireAdmin(req, res, next) {
  const session = verifySession(req.cookies[SESSION_COOKIE]);
  if (!session) return res.status(401).json({ error: 'Login necessario.' });
  req.admin = session;
  next();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function moneyToCents(value) {
  const normalized = Number(String(value || 0).replace(',', '.'));
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, Math.round(normalized * 100));
}

function centsToMoney(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function formatBrl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function extractIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return '********';
  return `${text.slice(0, 4)}********${text.slice(-4)}`;
}

function maskAdminSite(db) {
  const copy = structuredClone(publicSite(db));
  for (const [gateway, config] of Object.entries(copy.payments.gateways || {})) {
    for (const field of GATEWAYS[gateway]?.fields || []) {
      if (field.type === 'password' && config[field.key]) {
        config[field.key] = maskSecret(config[field.key]);
      }
    }
  }
  return copy;
}

function mergeGatewaySecrets(incoming, current) {
  const next = structuredClone(incoming || {});
  for (const [gateway, meta] of Object.entries(GATEWAYS)) {
    const fields = meta.fields.filter((field) => field.type === 'password');
    next.payments ||= {};
    next.payments.gateways ||= {};
    next.payments.gateways[gateway] ||= {};
    for (const field of fields) {
      const value = String(next.payments.gateways[gateway][field.key] || '');
      if (!value || value.includes('********')) {
        next.payments.gateways[gateway][field.key] = current?.payments?.gateways?.[gateway]?.[field.key] || '';
      }
    }
  }
  return next;
}

function sanitizeSitePayload(payload, current) {
  const merged = mergeGatewaySecrets(payload, current);
  const profile = { ...current.profile, ...(merged.profile || {}) };
  const checkout = { ...current.checkout, ...(merged.checkout || {}) };
  const plans = Array.isArray(merged.plans) ? merged.plans.map((plan, index) => ({
    id: String(plan.id || `plan_${index}_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, ''),
    name: String(plan.name || 'Plano').trim(),
    price: Number(plan.price || 0),
    oldPrice: plan.oldPrice === '' ? '' : Number(plan.oldPrice || 0),
    discount: String(plan.discount || '').trim(),
    durationDays: Number(plan.durationDays || 0),
    featured: !!plan.featured,
    active: plan.active !== false
  })).filter((plan) => plan.name && plan.price > 0) : current.plans;
  const gallery = Array.isArray(merged.gallery) ? merged.gallery.map((item, index) => ({
    id: String(item.id || `media_${index}_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, ''),
    type: ['photo', 'video', 'preview'].includes(item.type) ? item.type : 'photo',
    category: String(item.category || 'all').trim(),
    src: String(item.src || '').trim(),
    title: String(item.title || '').trim()
  })).filter((item) => item.src) : current.gallery;
  const payments = {
    ...current.payments,
    ...(merged.payments || {}),
    gateways: {
      ...current.payments.gateways,
      ...(merged.payments?.gateways || {})
    },
    gatewayOrder: normalizeGatewayOrder(merged.payments?.gatewayOrder || current.payments.gatewayOrder)
  };
  return { ...current, profile, checkout, plans, gallery, payments };
}

function normalizeGatewayOrder(order) {
  const ids = Object.keys(GATEWAYS);
  const incoming = Array.isArray(order) ? order : [];
  return [...new Set([...incoming, ...ids])].filter((id) => ids.includes(id));
}

function enabledGatewayOrder(payments) {
  return normalizeGatewayOrder(payments.gatewayOrder).filter((id) => payments.gateways?.[id]?.enabled);
}

function hasGatewayCredentials(gateway, config) {
  if (gateway === 'sync') return true;
  if (gateway === 'pushinpay') return !!String(config.token || '').trim();
  if (gateway === 'atomopay') return !!String(config.apiToken || '').trim() && !!String(config.offerHash || '').trim() && !!String(config.productHash || '').trim();
  if (gateway === 'bravopay') return !!String(config.apiKey || '').trim();
  return false;
}

function normalizeStatus(gateway, status) {
  const raw = String(status || '').toLowerCase();
  if (gateway === 'bravopay') {
    if (raw === 'paid') return 'paid';
    if (raw === 'expired') return 'expired';
    if (raw === 'refunded') return 'refunded';
    if (raw === 'failed' || raw === 'chargeback') return 'canceled';
    return 'pending';
  }
  if (raw === 'paid' || raw === 'approved') return 'paid';
  if (raw === 'expired') return 'expired';
  if (raw === 'canceled' || raw === 'cancelled') return 'canceled';
  if (raw === 'refunded') return 'refunded';
  return 'pending';
}

function gatewayMetric(db, gateway, key) {
  db.payments.metrics ||= {};
  db.payments.metrics[gateway] ||= { generated: 0, paid: 0, failed: 0 };
  db.payments.metrics[gateway][key] = Number(db.payments.metrics[gateway][key] || 0) + 1;
}

function buildLocalPixCode(tx) {
  return `00020126580014BR.GOV.BCB.PIX0136${tx.id}520400005303986540${centsToMoney(tx.amountCents)}5802BR5909PRIVACY6062SAO PAULO62070503***6304DEMO`;
}

async function createGatewayCharge({ gateway, config, tx, req }) {
  if (gateway === 'sync') {
    const pixCode = buildLocalPixCode(tx);
    return {
      externalId: tx.id,
      status: 'pending',
      pixCode,
      qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(pixCode)}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      raw: { demo: true }
    };
  }
  if (gateway === 'pushinpay') return createPushinPay(config, tx);
  if (gateway === 'atomopay') return createAtomoPay(config, tx);
  if (gateway === 'bravopay') return createBravoPay(config, tx);
  throw new Error('Gateway nao suportado.');
}

async function createPushinPay(config, tx) {
  const baseUrl = config.environment === 'sandbox' ? 'https://api-sandbox.pushinpay.com.br/api' : 'https://api.pushinpay.com.br/api';
  const payload = { value: tx.amountCents };
  if (config.webhookUrl) payload.webhook_url = config.webhookUrl;
  const data = await gatewayFetch(`${baseUrl}/pix/cashIn`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return {
    externalId: data.id,
    status: normalizeStatus('pushinpay', data.status),
    pixCode: data.qr_code,
    qrImage: data.qr_code_base64 || '',
    expiresAt: data.pix_details?.expiration_date || '',
    raw: data
  };
}

async function createAtomoPay(config, tx) {
  const url = new URL('https://api.atomopay.com.br/api/public/v1/transactions');
  url.searchParams.set('api_token', config.apiToken);
  const payload = {
    amount: tx.amountCents,
    offer_hash: config.offerHash,
    payment_method: 'pix',
    customer: tx.customer,
    cart: [{
      product_hash: config.productHash,
      title: tx.planName,
      price: tx.amountCents,
      quantity: 1,
      operation_type: 1,
      tangible: false
    }],
    tracking: tx.utm || {}
  };
  if (config.postbackUrl) payload.postback_url = config.postbackUrl;
  const data = await gatewayFetch(url.toString(), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = data.data || data;
  return {
    externalId: body.hash,
    status: normalizeStatus('atomopay', body.status),
    pixCode: body.pix_code,
    qrImage: body.qr_code || '',
    expiresAt: body.expires_at || '',
    raw: data
  };
}

async function createBravoPay(config, tx) {
  const baseUrl = String(config.baseUrl || 'https://bravopay.club/api/v1').replace(/\/+$/, '');
  const payload = {
    amount_cents: tx.amountCents,
    method: 'pix',
    customer: {
      email: tx.customer.email,
      name: tx.customer.name,
      cpf: tx.customer.document,
      phone: tx.customer.phone_number
    },
    description: tx.planName,
    external_reference: tx.id,
    expires_in: 3600,
    utm: tx.utm || {}
  };
  const data = await gatewayFetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Idempotency-Key': tx.id
    },
    body: JSON.stringify(payload)
  });
  return {
    externalId: data.id,
    status: normalizeStatus('bravopay', data.status),
    pixCode: data.pix?.copy_paste || data.pix?.qr_code || '',
    qrImage: data.pix?.qr_code?.startsWith('data:') ? data.pix.qr_code : '',
    expiresAt: data.pix?.expires_at || '',
    raw: data
  };
}

async function gatewayFetch(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) {
      const code = data?.error?.code || data?.message || response.statusText;
      throw new Error(`${response.status} ${code}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function publicTransaction(tx) {
  return {
    id: tx.id,
    gateway: tx.gateway,
    status: tx.status,
    planName: tx.planName,
    amount: centsToMoney(tx.amountCents),
    pixCode: tx.pixCode,
    qrImage: tx.qrImage || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(tx.pixCode || '')}`,
    expiresAt: tx.expiresAt
  };
}

function updateTransactionStatus(db, tx, status, raw = {}) {
  const old = tx.status;
  tx.status = status;
  tx.rawStatus = raw.status || raw.raw_status || status;
  tx.events ||= [];
  tx.events.push({ at: new Date().toISOString(), status, raw });
  tx.updatedAt = new Date().toISOString();
  if (old !== 'paid' && status === 'paid') {
    tx.paidAt = new Date().toISOString();
    gatewayMetric(db, tx.gateway, 'paid');
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function saveUploadedFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.webp';
  const filename = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  if (!USE_SUPABASE) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
    return `/uploads/${filename}`;
  }
  const objectPath = `admin/${filename}`;
  await supabaseRequest(`/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.mimetype || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: file.buffer
  });
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
}

ensureData();
app.use(cookieParser());
app.use('/api/webhooks/bravopay', express.raw({ type: '*/*', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/site', asyncRoute(async (_req, res) => res.json(publicSite(await readDb()))));
app.get('/api/admin/meta', requireAdmin, (_req, res) => res.json({ gateways: GATEWAYS }));
app.get('/api/admin/site', requireAdmin, asyncRoute(async (_req, res) => res.json(maskAdminSite(await readDb()))));
app.put('/api/admin/site', requireAdmin, asyncRoute(async (req, res) => {
  const current = await readDb();
  const next = sanitizeSitePayload(req.body || {}, current);
  await writeDb(next);
  res.json({ ok: true, site: maskAdminSite(next) });
}));

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const db = await readDb();
  const password = String(req.body?.password || '');
  if (!safeEqual(hashPassword(password), db.admin.passwordHash)) {
    return res.status(401).json({ error: 'Senha invalida.' });
  }
  const token = signSession({ role: 'admin', exp: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS });
  res.json({ ok: true });
}));

app.post('/api/admin/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => res.json({ ok: true }));

app.post('/api/admin/password', requireAdmin, asyncRoute(async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'Use uma senha com pelo menos 8 caracteres.' });
  const db = await readDb();
  db.admin.passwordHash = hashPassword(password);
  await writeDb(db);
  res.json({ ok: true });
}));

app.post('/api/admin/upload', requireAdmin, upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo nao enviado.' });
  const url = await saveUploadedFile(req.file);
  res.json({ ok: true, url });
}));

app.get('/api/admin/transactions', requireAdmin, asyncRoute(async (_req, res) => {
  const db = await readDb();
  res.json({ transactions: [...(db.transactions || [])].reverse().slice(0, 200), metrics: db.payments.metrics || {} });
}));

app.get('/api/admin/leads', requireAdmin, asyncRoute(async (_req, res) => {
  const db = await readDb();
  res.json({ leads: await listLeads(db) });
}));

app.post('/api/admin/transactions/:id/mark-paid', requireAdmin, asyncRoute(async (req, res) => {
  const db = await readDb();
  const tx = (db.transactions || []).find((item) => item.id === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transacao nao encontrada.' });
  updateTransactionStatus(db, tx, 'paid', { manual: true });
  await upsertLead(db, leadFromTransaction(tx));
  await writeDb(db);
  res.json({ ok: true, transaction: tx });
}));

app.post('/api/admin/gateways/test', requireAdmin, asyncRoute(async (req, res) => {
  const db = await readDb();
  const amountCents = Math.max(100, moneyToCents(req.body?.amount || 1));
  const selected = Array.isArray(req.body?.gateways) ? req.body.gateways : enabledGatewayOrder(db.payments);
  const results = [];
  for (const gateway of normalizeGatewayOrder(selected)) {
    const config = db.payments.gateways[gateway] || {};
    if (!config.enabled) {
      results.push({ gateway, ok: false, detail: 'Gateway desativado.' });
      continue;
    }
    if (!hasGatewayCredentials(gateway, config)) {
      results.push({ gateway, ok: false, detail: 'Credenciais incompletas.' });
      continue;
    }
    const tx = buildTransaction(db, { plan: { id: 'admin-test', name: 'Teste admin', price: amountCents / 100 }, customer: {}, gateway });
    try {
      const charge = await createGatewayCharge({ gateway, config, tx });
      results.push({ gateway, ok: true, externalId: charge.externalId, pixCode: charge.pixCode, qrImage: charge.qrImage, detail: 'PIX gerado com sucesso.' });
    } catch (error) {
      results.push({ gateway, ok: false, detail: error.message });
    }
  }
  res.json({ ok: results.some((item) => item.ok), results });
}));

function buildTransaction(db, input) {
  const now = new Date().toISOString();
  const plan = input.plan;
  const amountCents = moneyToCents(plan.price);
  const customer = {
    name: String(input.customer?.name || 'Cliente Privacy').trim(),
    email: String(input.customer?.email || `cliente.${Date.now()}@privacy.local`).trim(),
    phone_number: String(input.customer?.phone || '11999999999').replace(/\D/g, ''),
    document: String(input.customer?.document || '11144477735').replace(/\D/g, '')
  };
  return {
    id: `pix_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    gateway: input.gateway,
    externalId: '',
    status: 'pending',
    rawStatus: 'pending',
    amountCents,
    planId: plan.id,
    planName: plan.name,
    customer,
    utm: input.utm || {},
    ip: input.ip || '',
    userAgent: input.userAgent || '',
    pixCode: '',
    qrImage: '',
    expiresAt: '',
    createdAt: now,
    updatedAt: now,
    events: [{ at: now, status: 'pending', raw: { created: true } }]
  };
}

app.post('/api/pix/create', asyncRoute(async (req, res) => {
  const db = await readDb();
  const plan = (db.plans || []).find((item) => item.id === req.body?.planId && item.active !== false);
  if (!plan) return res.status(400).json({ error: 'Plano invalido.' });
  const customerInput = req.body?.customer || {};
  if (!String(customerInput.name || '').trim() || !String(customerInput.email || '').includes('@') || !String(customerInput.phone || '').replace(/\D/g, '')) {
    return res.status(400).json({ error: 'Preencha nome, email e WhatsApp para gerar o PIX.' });
  }
  const order = enabledGatewayOrder(db.payments);
  if (!order.length) return res.status(503).json({ error: 'Nenhum gateway ativo no painel.' });

  const errors = [];
  for (const gateway of order) {
    const config = db.payments.gateways[gateway] || {};
    if (!hasGatewayCredentials(gateway, config)) {
      errors.push({ gateway, error: 'Credenciais incompletas.' });
      continue;
    }
    const tx = buildTransaction(db, {
      plan,
      customer: customerInput,
      utm: req.body?.utm || {},
      gateway,
      ip: extractIp(req),
      userAgent: req.headers['user-agent'] || ''
    });
    try {
      const charge = await createGatewayCharge({ gateway, config, tx, req });
      tx.externalId = charge.externalId || tx.id;
      tx.status = charge.status || 'pending';
      tx.rawStatus = charge.status || 'pending';
      tx.pixCode = charge.pixCode || '';
      tx.qrImage = charge.qrImage || '';
      tx.expiresAt = charge.expiresAt || '';
      tx.rawCreate = charge.raw || {};
      db.transactions ||= [];
      db.transactions.push(tx);
      gatewayMetric(db, gateway, 'generated');
      await upsertLead(db, leadFromTransaction(tx));
      await writeDb(db);
      return res.json(publicTransaction(tx));
    } catch (error) {
      gatewayMetric(db, gateway, 'failed');
      errors.push({ gateway, error: error.message });
    }
  }
  await writeDb(db);
  res.status(502).json({ error: 'Falha ao gerar PIX nos gateways ativos.', details: errors });
}));

app.get('/api/pix/status/:id', asyncRoute(async (req, res) => {
  const db = await readDb();
  const tx = (db.transactions || []).find((item) => item.id === req.params.id || item.externalId === req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transacao nao encontrada.' });
  const cfg = db.payments.gateways?.[tx.gateway] || {};
  if (tx.gateway === 'sync' && tx.status !== 'paid' && Number(cfg.autoApproveSeconds || 0) > 0) {
    const age = Date.now() - new Date(tx.createdAt).getTime();
    if (age >= Number(cfg.autoApproveSeconds) * 1000) updateTransactionStatus(db, tx, 'paid', { autoApprove: true });
  }
  await upsertLead(db, leadFromTransaction(tx));
  await writeDb(db);
  res.json(publicTransaction(tx));
}));

app.post('/api/webhooks/pushinpay', asyncRoute(async (req, res) => {
  const db = await readDb();
  const body = req.body || {};
  const externalId = body.id || body.transaction_id || body.transactionId;
  const tx = (db.transactions || []).find((item) => item.externalId === externalId);
  if (tx) {
    updateTransactionStatus(db, tx, normalizeStatus('pushinpay', body.status), body);
    await upsertLead(db, leadFromTransaction(tx));
  }
  await writeDb(db);
  res.json({ ok: true });
}));

app.post('/api/webhooks/atomopay', asyncRoute(async (req, res) => {
  const db = await readDb();
  const body = req.body || {};
  const externalId = body.transaction_hash || body.hash;
  const tx = (db.transactions || []).find((item) => item.externalId === externalId);
  if (tx) {
    updateTransactionStatus(db, tx, normalizeStatus('atomopay', body.status), body);
    await upsertLead(db, leadFromTransaction(tx));
  }
  await writeDb(db);
  res.json({ ok: true });
}));

app.post('/api/webhooks/bravopay', asyncRoute(async (req, res) => {
  const db = await readDb();
  const cfg = db.payments.gateways?.bravopay || {};
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.headers['x-bravopay-signature'];
  if (cfg.webhookSecret) {
    const expected = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBody).digest('hex');
    if (!safeEqual(signature, expected)) return res.status(401).json({ error: 'Assinatura invalida.' });
  }
  let body = {};
  try { body = JSON.parse(rawBody.toString('utf8') || '{}'); } catch { return res.status(400).json({ error: 'JSON invalido.' }); }
  const eventType = body.type || '';
  const txData = body.data || body.transaction || {};
  const externalId = txData.id || body.transaction_id || body.id;
  const reference = txData.external_reference || body.external_reference;
  const tx = (db.transactions || []).find((item) => item.externalId === externalId || item.id === reference);
  if (tx) {
    const status = eventType === 'transaction.paid' ? 'paid' : normalizeStatus('bravopay', txData.status || body.status);
    updateTransactionStatus(db, tx, status, body);
    await upsertLead(db, leadFromTransaction(tx));
  }
  await writeDb(db);
  res.json({ ok: true });
}));

app.use('/api', (error, _req, res, _next) => {
  console.error('[api]', error);
  res.status(500).json({ error: error.message || 'Erro interno.' });
});

app.get('/admin', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Privacy admin checkout running on http://localhost:${PORT}`);
  });
}

module.exports = app;
