import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/products';
import { ProductDetail } from './ProductDetail';

/**
 * Product page. The [id] segment is the product SKU (e.g. "hh-01"), which
 * keeps URLs readable while the client still receives the real UUID on the
 * product object for cart and order calls.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getProductBySlug(id);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product);

  return <ProductDetail product={product} relatedProducts={relatedProducts} />;
}
