// The backend product model only has: name, description, price, stock, imageUrl.
// Category / gender / collection / extra images are therefore carried as small
// bracketed tags at the end of the description, e.g.
//     Heavyweight cotton tee.  [category: Tops] [gender: men] [collection: Night Shift]
//     [images: https://…/back.jpg | https://…/detail.jpg]
// The admin product form writes these tags. When they're absent, category and gender
// are inferred from the product name/description with the keyword rules below.
// This is the ONE place to change if the API later exposes real fields.

const TAG_RE = /\[\s*(category|gender|collection|images)\s*:\s*([^\]]*)\]/gi;

export const CATEGORIES = ['Outerwear', 'Knitwear', 'Tops', 'Bottoms', 'Dresses', 'Footwear', 'Accessories'];
export const GENDERS = [
  { id: 'men', label: 'Men' },
  { id: 'women', label: 'Women' },
  { id: 'unisex', label: 'Unisex' }
];

const CATEGORY_RULES = [
  ['Outerwear', /\b(jacket|coat|bomber|parka|puffer|windbreaker|trench|vest|gilet|blazer|varsity)\b/i],
  ['Knitwear', /\b(hoodie|hoody|sweater|sweatshirt|knit|cardigan|pullover|crewneck|fleece)\b/i],
  ['Dresses', /\b(dress|gown|jumpsuit|romper)\b/i],
  ['Bottoms', /\b(pant|pants|jean|jeans|trouser|trousers|short|shorts|skirt|cargo|jogger|joggers|sweatpants|legging|leggings)\b/i],
  ['Footwear', /\b(sneaker|sneakers|boot|boots|shoe|shoes|loafer|loafers|sandal|sandals|slides)\b/i],
  ['Accessories', /\b(cap|hat|beanie|bag|tote|backpack|belt|scarf|glove|gloves|watch|socks|wallet|sunglasses)\b/i],
  ['Tops', /\b(tee|t-shirt|tshirt|shirt|top|blouse|polo|tank|bodysuit|jersey)\b/i]
];

export function parseMeta(description = '') {
  const meta = { category: '', gender: '', collection: '', images: [] };
  const text = String(description || '').replace(TAG_RE, (_, k, v) => {
    k = k.toLowerCase();
    if (k === 'images') meta.images = v.split('|').map((s) => s.trim()).filter(Boolean);
    else if (k === 'gender') meta.gender = v.trim().toLowerCase();
    else meta[k] = v.trim();
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { text, meta };
}

export function composeDescription(text, { category, gender, collection, images } = {}) {
  const tags = [];
  if (category) tags.push(`[category: ${category}]`);
  if (gender) tags.push(`[gender: ${gender}]`);
  if (collection) tags.push(`[collection: ${collection}]`);
  if (images?.length) tags.push(`[images: ${images.join(' | ')}]`);
  return [String(text || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
}

export function inferCategory(name = '', description = '') {
  const hay = `${name} ${description}`;
  const byName = CATEGORY_RULES.find(([, re]) => re.test(name));
  if (byName) return byName[0];
  return CATEGORY_RULES.find(([, re]) => re.test(hay))?.[0] || 'Essentials';
}

export function inferGender(name = '', description = '') {
  const hay = `${name} ${description}`;
  if (/\b(women'?s?|woman|ladies|lady|female|girls?)\b/i.test(hay)) return 'women';
  if (/\b(men'?s?|man|male|boys?)\b/i.test(hay)) return 'men';
  return 'unisex';
}
