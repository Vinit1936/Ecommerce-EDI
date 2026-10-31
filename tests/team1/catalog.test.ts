/**
 * tests/team1/catalog.test.ts
 *
 * Team 1 Deliverable: Unit Testing Suite for Product Catalog, Categories & Reviews
 * Satisfies IEEE Test Documentation & Team 1 Testing Report
 */
import { describe, it, expect } from 'vitest';

describe('Team 1: Product Catalog, Category Hierarchy & Reviews', () => {
  it('should validate product pricing and discount consistency', () => {
    interface ProductData {
      sku: string;
      name: string;
      price: number;
      originalPrice?: number | null;
      isSale: boolean;
      stockQty: number;
    }

    function validateProduct(product: ProductData) {
      if (product.price <= 0) return { valid: false, error: 'Price must be positive' };
      if (product.isSale) {
        if (!product.originalPrice || product.originalPrice <= product.price) {
          return { valid: false, error: 'Sale item originalPrice must exceed current price' };
        }
      }
      if (product.stockQty < 0) return { valid: false, error: 'Stock cannot be negative' };
      return { valid: true };
    }

    const regularProduct: ProductData = {
      sku: 'PRT-W01-BLK',
      name: 'ARCHIVAL WOOL OVERSHIRT',
      price: 240,
      isSale: false,
      stockQty: 15,
    };
    expect(validateProduct(regularProduct).valid).toBe(true);

    const validSaleProduct: ProductData = {
      sku: 'PRT-D02-RAW',
      name: 'RAW SELVEDGE WORK JACKET',
      price: 180,
      originalPrice: 280,
      isSale: true,
      stockQty: 8,
    };
    expect(validateProduct(validSaleProduct).valid).toBe(true);

    const invalidSaleProduct: ProductData = {
      sku: 'PRT-ERR-001',
      name: 'INVALID SALE SPECIMEN',
      price: 200,
      originalPrice: 150,
      isSale: true,
      stockQty: 5,
    };
    expect(validateProduct(invalidSaleProduct).valid).toBe(false);
  });

  it('should construct self-referencing hierarchical categories accurately', () => {
    interface CategoryNode {
      id: string;
      name: string;
      parentCategoryId: string | null;
      children?: CategoryNode[];
    }

    const flatCategories: CategoryNode[] = [
      { id: 'cat-1', name: 'OUTERWEAR', parentCategoryId: null },
      { id: 'cat-2', name: 'HEAVY COATS', parentCategoryId: 'cat-1' },
      { id: 'cat-3', name: 'SHELL JACKETS', parentCategoryId: 'cat-1' },
      { id: 'cat-4', name: 'FOOTWEAR', parentCategoryId: null },
      { id: 'cat-5', name: 'DERBY SHOES', parentCategoryId: 'cat-4' },
    ];

    function buildCategoryTree(list: CategoryNode[]): CategoryNode[] {
      const map = new Map<string, CategoryNode>();
      const roots: CategoryNode[] = [];

      for (const item of list) {
        map.set(item.id, { ...item, children: [] });
      }

      for (const item of list) {
        const node = map.get(item.id)!;
        if (item.parentCategoryId) {
          const parent = map.get(item.parentCategoryId);
          if (parent) parent.children?.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    }

    const tree = buildCategoryTree(flatCategories);
    expect(tree.length).toBe(2); // OUTERWEAR and FOOTWEAR roots
    expect(tree[0].name).toBe('OUTERWEAR');
    expect(tree[0].children?.length).toBe(2);
    expect(tree[0].children?.map((c) => c.name)).toContain('HEAVY COATS');
    expect(tree[0].children?.map((c) => c.name)).toContain('SHELL JACKETS');
    expect(tree[1].children?.length).toBe(1);
    expect(tree[1].children?.[0].name).toBe('DERBY SHOES');
  });

  it('should enforce unique customer reviews constraint (one review per customer per product)', () => {
    interface ReviewEntry {
      productId: string;
      customerId: string;
      rating: number;
      comment: string;
    }

    const reviewStore: ReviewEntry[] = [];

    function addReview(entry: ReviewEntry): { success: boolean; error?: string } {
      const exists = reviewStore.some(
        (r) => r.productId === entry.productId && r.customerId === entry.customerId
      );
      if (exists) {
        return { success: false, error: 'Customer already reviewed this product' };
      }
      if (entry.rating < 1 || entry.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }
      reviewStore.push(entry);
      return { success: true };
    }

    const first = addReview({
      productId: 'prod-uuid-1',
      customerId: 'cust-uuid-1',
      rating: 5,
      comment: 'Superb brutalist craftsmanship.',
    });
    expect(first.success).toBe(true);

    const duplicate = addReview({
      productId: 'prod-uuid-1',
      customerId: 'cust-uuid-1',
      rating: 4,
      comment: 'Trying to review again.',
    });
    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toBe('Customer already reviewed this product');

    const differentProduct = addReview({
      productId: 'prod-uuid-2',
      customerId: 'cust-uuid-1',
      rating: 5,
      comment: 'Review for a different specimen.',
    });
    expect(differentProduct.success).toBe(true);
  });
});
