export type WhatsappIntent =
  | { type: 'menu' }
  | { type: 'cart' }
  | { type: 'checkout' }
  | { type: 'category'; slug: string }
  | { type: 'add'; slug: string }
  | { type: 'pick'; index: number }
  | { type: 'remove'; index?: number }
  | { type: 'qty'; quantity: number }
  | { type: 'track' }
  | { type: 'collection' }
  | { type: 'delivery' }
  | { type: 'search'; q: string };

const CATEGORY_WORDS: Record<string, string> = {
  hijab: 'hijabs',
  hijabs: 'hijabs',
  abaya: 'abayas',
  abayas: 'abayas',
  dress: 'dresses',
  dresses: 'dresses',
  jilbab: 'jilbabs',
  jilbabs: 'jilbabs',
  niqab: 'niqabs',
  niqabs: 'niqabs',
  khimar: 'khimars',
  khimars: 'khimars',
  prayer: 'prayer-sets',
  'prayer set': 'prayer-sets',
  'prayer sets': 'prayer-sets',
  undercap: 'undercaps',
  undercaps: 'undercaps',
  accessory: 'accessories',
  accessories: 'accessories',
  pin: 'accessories',
  pins: 'accessories',
  magnet: 'accessories',
  magnets: 'accessories',
};

function normalizeWa(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function encodeWhatsappPicks(slugs: string[]) {
  return `picks:${slugs.join(',')}`;
}

export function decodeWhatsappPicks(lastMessage?: string | null) {
  if (!lastMessage?.startsWith('picks:')) return [];
  return lastMessage
    .slice(6)
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
}

export function encodeWhatsappVariants(slug: string, ids: string[]) {
  return `vars:${slug}|${ids.join(',')}`;
}

export function decodeWhatsappVariants(lastMessage?: string | null) {
  if (!lastMessage?.startsWith('vars:')) return null;
  const raw = lastMessage.slice(5);
  const bar = raw.indexOf('|');
  if (bar < 0) return null;
  const slug = raw.slice(0, bar).trim();
  const ids = raw
    .slice(bar + 1)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (!slug || !ids.length) return null;
  return { slug, ids };
}

export function whatsappIntent(raw: string): WhatsappIntent {
  const text = normalizeWa(raw);
  if (!text || /^(hi|hello|hey|salaam|salam|as-salamu alaykum|menu|start|help)$/.test(text)) {
    return { type: 'menu' };
  }
  if (text === 'cart' || text === 'basket' || text === 'bag') return { type: 'cart' };
  if (text === 'checkout' || text === 'pay' || text === 'pay now' || text === 'buy') return { type: 'checkout' };
  if (/^(collect|collection|pickup|pick up)$/.test(text)) return { type: 'collection' };
  if (/^(deliver|delivery|ship|post)$/.test(text)) return { type: 'delivery' };
  if (/^(track|tracking|where is my order|where's my order|order status)$/.test(text)) return { type: 'track' };
  const remove = text.match(/^(remove|delete)(?:\s+(\d+))?$/);
  if (remove) {
    return { type: 'remove', index: remove[2] ? Number(remove[2]) - 1 : undefined };
  }
  const qty = text.match(/^(qty|quantity)\s+(\d+)$/);
  if (qty?.[2]) return { type: 'qty', quantity: Number(qty[2]) };
  if (text.startsWith('cat:')) return { type: 'category', slug: text.slice(4).trim() };
  if (text.startsWith('add:')) return { type: 'add', slug: text.slice(4).trim().replace(/\s+/g, '-') };
  const addWord = text.match(/^add\s+(.+)$/);
  if (addWord?.[1]) return { type: 'add', slug: addWord[1].replace(/\s+/g, '-') };
  if (/^[1-8]$/.test(text)) return { type: 'pick', index: Number(text) - 1 };
  const category = CATEGORY_WORDS[text];
  if (category) return { type: 'category', slug: category };
  return { type: 'search', q: text };
}
