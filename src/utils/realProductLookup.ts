import { ProductCategory, UnitType } from '../types/pos';
import { sanitizeBarcodeInput } from './security';

export interface RealProductResult {
  found: boolean;
  code: string;
  name?: string;
  brand?: string;
  category?: ProductCategory;
  unitType?: UnitType;
  emoji?: string;
  imageUrl?: string;
  source?: 'LOCAL' | 'OPEN_FOOD_FACTS';
}

/**
 * Determine POS category and emoji from raw product keywords / tags.
 */
function inferCategoryAndEmoji(text: string): { category: ProductCategory; unitType: UnitType; emoji: string } {
  const lower = text.toLowerCase();

  // 1. BEBIDAS
  if (
    lower.includes('bebida') ||
    lower.includes('beverage') ||
    lower.includes('drink') ||
    lower.includes('refresco') ||
    lower.includes('soda') ||
    lower.includes('cola') ||
    lower.includes('agua') ||
    lower.includes('jugo') ||
    lower.includes('cerveza') ||
    lower.includes('tequila') ||
    lower.includes('vino') ||
    lower.includes('te') ||
    lower.includes('cafe')
  ) {
    return { category: 'BEBIDAS', unitType: 'pz', emoji: '🥤' };
  }

  // 2. LACTEOS
  if (
    lower.includes('leche') ||
    lower.includes('lacteo') ||
    lower.includes('dairy') ||
    lower.includes('queso') ||
    lower.includes('cheese') ||
    lower.includes('yogur') ||
    lower.includes('crema') ||
    lower.includes('mantequilla')
  ) {
    return { category: 'LACTEOS', unitType: 'pz', emoji: '🥛' };
  }

  // 3. LIMPIEZA
  if (
    lower.includes('limpieza') ||
    lower.includes('clean') ||
    lower.includes('detergent') ||
    lower.includes('jabon') ||
    lower.includes('soap') ||
    lower.includes('shampoo') ||
    lower.includes('cloro') ||
    lower.includes('suavizante') ||
    lower.includes('desinfectante') ||
    lower.includes('papel higienico') ||
    lower.includes('toalla')
  ) {
    return { category: 'LIMPIEZA', unitType: 'pz', emoji: '🧼' };
  }

  // 4. GRANEL
  if (
    lower.includes('granel') ||
    lower.includes('semilla') ||
    lower.includes('frijol') ||
    lower.includes('arroz') ||
    lower.includes('lenteja') ||
    lower.includes('maiz') ||
    lower.includes('chile seco') ||
    lower.includes('nuez') ||
    lower.includes('almendra')
  ) {
    return { category: 'GRANEL', unitType: 'kg', emoji: '⚖️' };
  }

  // 5. ABARROTES (Default)
  let emoji = '📦';
  if (lower.includes('galleta') || lower.includes('cookie') || lower.includes('pan') || lower.includes('bimbo')) emoji = '🍞';
  else if (lower.includes('botana') || lower.includes('snack') || lower.includes('papas') || lower.includes('sabritas') || lower.includes('chips')) emoji = '🥔';
  else if (lower.includes('chocolate') || lower.includes('dulce') || lower.includes('candy')) emoji = '🍫';
  else if (lower.includes('atun') || lower.includes('sardina') || lower.includes('enlatado')) emoji = '🥫';
  else if (lower.includes('pasta') || lower.includes('sopa') || lower.includes('maruchan')) emoji = '🍜';
  else if (lower.includes('aceite') || lower.includes('manteca')) emoji = '🫒';

  return { category: 'ABARROTES', unitType: 'pz', emoji };
}

/**
 * Clean and format real product title: capitalizes properly, removes noise.
 */
function cleanProductName(name: string, brand?: string): string {
  let cleaned = name.trim();
  if (brand && !cleaned.toLowerCase().includes(brand.toLowerCase())) {
    cleaned = `${brand.trim()} ${cleaned}`;
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Real barcode lookup engine against Open Food Facts (global & Mexico database).
 * Supports standard retail barcodes (EAN-13, EAN-8, UPC-A, UPC-E).
 */
export async function lookupRealProduct(rawBarcode: string): Promise<RealProductResult> {
  const sanitized = sanitizeBarcodeInput(rawBarcode);
  if (!sanitized) {
    return { found: false, code: rawBarcode };
  }

  // Only digits allowed for standard EAN/UPC barcodes
  const digitsOnly = sanitized.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 14) {
    return { found: false, code: sanitized };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://world.openfoodfacts.org/api/v0/product/${digitsOnly}.json`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'POS-Abarrotes/1.0 (PWA-Retail-Terminal)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { found: false, code: digitsOnly };
    }

    const data = await response.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const rawName = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '';
      const brand = p.brands ? p.brands.split(',')[0].trim() : '';

      if (!rawName.trim()) {
        return { found: false, code: digitsOnly };
      }

      const categoriesStr = [
        p.categories || '',
        p.categories_tags?.join(' ') || '',
        rawName,
        brand
      ].join(' ');

      const { category, unitType, emoji } = inferCategoryAndEmoji(categoriesStr);
      const formattedName = cleanProductName(rawName, brand);

      return {
        found: true,
        code: digitsOnly,
        name: formattedName,
        brand: brand || undefined,
        category,
        unitType,
        emoji,
        imageUrl: p.image_front_small_url || p.image_url || undefined,
        source: 'OPEN_FOOD_FACTS',
      };
    }
  } catch (err) {
    // Graceful offline fallback
    console.debug('Lookup barcode offline or error:', err);
  }

  return { found: false, code: digitsOnly };
}

/**
 * Search real products online by name/query when barcode is not available.
 */
export async function searchRealProductsByName(query: string): Promise<RealProductResult[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 3) return [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://mx.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=6`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'POS-Abarrotes/1.0 (PWA-Retail-Terminal)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json();
    if (Array.isArray(data.products)) {
      return data.products
        .filter((p: any) => p.code && (p.product_name || p.product_name_es))
        .map((p: any) => {
          const rawName = p.product_name_es || p.product_name || '';
          const brand = p.brands ? p.brands.split(',')[0].trim() : '';
          const catStr = [p.categories || '', rawName, brand].join(' ');
          const { category, unitType, emoji } = inferCategoryAndEmoji(catStr);

          return {
            found: true,
            code: p.code,
            name: cleanProductName(rawName, brand),
            brand: brand || undefined,
            category,
            unitType,
            emoji,
            imageUrl: p.image_front_small_url || p.image_url || undefined,
            source: 'OPEN_FOOD_FACTS',
          };
        });
    }
  } catch {
    // Offline or network error
  }

  return [];
}
