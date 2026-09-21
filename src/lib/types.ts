/**
 * Shared domain types.
 *
 * `Product` intentionally mirrors the shape the UI components already consume
 * (previously exported from mock-data.ts) so the catalog could move to the
 * database without redesigning every component. Two deliberate differences:
 *
 *   id    - now the real database UUID, because cart and order routes key on it
 *   slug  - the human-readable SKU ("hh-01") used for /product/... URLs
 */

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  /** Database UUID. Use this for API calls. */
  id: string;
  /** SKU, e.g. "hh-01". Use this for URLs. */
  slug: string;
  specimenNo: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  brand: string;
  description: string;
  details: string[];
  images: string[];
  /** Derived from stockCount > 0 — never stored, so it cannot drift. */
  inStock: boolean;
  stockCount: number;
  sizes?: string[];
  colors?: ProductColor[];
  isFeatured?: boolean;
  isNew?: boolean;
  isSale?: boolean;
  heroSpan?: 'full' | 'half' | 'quarter';
}

export interface CategoryRef {
  id: string;
  name: string;
}

export interface BrandRef {
  id: string;
  name: string;
}

export type ProductSort = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export interface ProductQuery {
  q?: string;
  category?: string;
  brand?: string;
  sort?: ProductSort;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}
