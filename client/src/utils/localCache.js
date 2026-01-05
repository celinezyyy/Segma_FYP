// Lightweight localStorage cache for segmentation dashboard

const PREFIX = 'segmentationDashboard:';

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

export function buildSegmentationKey(segmentationId, customerDatasetId = null, orderDatasetId = null) {
  const cust = customerDatasetId || 'na';
  const ord = orderDatasetId || 'na';
  return `${PREFIX}${String(segmentationId)}|cust:${cust}|ord:${ord}`;
}

export function setCache(key, payload, ttlMs = null) {
  const record = { payload, timestamp: Date.now(), ttl: ttlMs ?? null };
  try { localStorage.setItem(key, JSON.stringify(record)); } catch {}
}

export function getCache(key, ttlMs = null) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const record = safeParse(raw);
  if (!record || !record.timestamp) return null;
  const ttl = ttlMs ?? record.ttl ?? null;
  if (ttl && Date.now() - record.timestamp > ttl) return null;
  return record.payload ?? null;
}

function listNamespaceKeys() {
  const items = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    const rec = safeParse(localStorage.getItem(key));
    const ts = rec?.timestamp || 0;
    items.push({ key, timestamp: ts });
  }
  return items;
}

export function pruneExpired(defaultTtlMs = null) {
  const keys = listNamespaceKeys();
  for (const { key } of keys) {
    const rec = safeParse(localStorage.getItem(key));
    if (!rec || !rec.timestamp) { try { localStorage.removeItem(key); } catch {}; continue; }
    const ttl = rec.ttl ?? defaultTtlMs;
    if (ttl && Date.now() - rec.timestamp > ttl) {
      try { localStorage.removeItem(key); } catch {}
    }
  }
}

export function pruneToCapacity(maxEntries = 10) {
  const keys = listNamespaceKeys().sort((a, b) => b.timestamp - a.timestamp);
  for (let i = maxEntries; i < keys.length; i++) {
    try { localStorage.removeItem(keys[i].key); } catch {}
  }
}

export function clearNamespace() {
  const keys = listNamespaceKeys();
  for (const { key } of keys) {
    try { localStorage.removeItem(key); } catch {}
  }
}
