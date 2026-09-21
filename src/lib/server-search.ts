import { getSupabaseClient } from '@/storage/database/supabase-client';
import { fetchProducts } from '@/lib/database';
import { matchWords } from '@/lib/word-match';
import { makeExcerpt } from '@/lib/excerpt';

export interface SearchProductHit {
  slug: string;
  name: string;
  image_url: string | null;
  price: string | null;
}

export interface SearchArticleHit {
  id: number;
  type: string;
  slug: string;
  cover_image: string | null;
  sort_order: number;
  title: string;
  created_at: string | null;
  excerpt: string;
  author: { id: number; name: string; avatar_url: string | null } | null;
}

export interface FullSearchResults {
  products: SearchProductHit[];
  news: SearchArticleHit[];
  best_vapes: SearchArticleHit[];
}

const EMPTY_RESULTS: FullSearchResults = { products: [], news: [], best_vapes: [] };

function displayPriceValue(p: Record<string, unknown>): number {
  const raw =
    p.promotion_id != null && p.promo_price != null && p.promo_price !== ''
      ? p.promo_price
      : p.current_price;
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? Infinity : n;
}

function firstWord(q: string): string {
  return q.trim().split(/\s+/)[0] || q.trim();
}

/**
 * Server-side unified search used both by /api/search and the /search page SSR.
 * Matching is by word spelling order (prefix). Products are limited to
 * productLimit (API uses 10, the landing page fetches more for pagination).
 */
export async function runSearch(
  q: string,
  language = 'en',
  currency = '$',
  productLimit = 10,
): Promise<FullSearchResults> {
  const query = (q || '').trim();
  if (!query) return EMPTY_RESULTS;

  const supabase = getSupabaseClient();
  if (!supabase) return EMPTY_RESULTS;

  try {
    // ---- Products ----
    let products: SearchProductHit[] = [];
    try {
      const list = (await fetchProducts({
        language,
        limit: 500,
        offset: 0,
        search: firstWord(query),
        currency,
      })) as Record<string, unknown>[];

      for (const product of list) {
        const translations =
          (product.translations as Array<{ language: string; name: string }>) || [];
        const t =
          translations.find((x) => x.language === language) ||
          translations.find((x) => x.language === 'en') ||
          translations[0];
        const name = t?.name || '';
        if (!matchWords(query, name)) continue;

        const prices = (product.prices as Record<string, unknown>[]) || [];
        const priced = prices.filter(
          (p) =>
            displayPriceValue(p) !== Infinity &&
            (p.currency || '$') === currency,
        );
        let lowest: Record<string, unknown> | null = null;
        if (priced.length > 0) {
          lowest = priced.reduce(
            (min, p) => (displayPriceValue(p) < displayPriceValue(min) ? p : min),
            priced[0],
          );
        }
        products.push({
          slug: product.slug as string,
          name,
          image_url: (product.image_url as string | null) ?? null,
          price: lowest
            ? String(
                lowest.promotion_id != null &&
                  lowest.promo_price != null &&
                  lowest.promo_price !== ''
                  ? lowest.promo_price
                  : lowest.current_price,
              )
            : null,
        });
        if (products.length >= productLimit) break;
      }
    } catch {
      products = [];
    }

    // ---- Articles ----
    const fetchArticles = async (type: 'news' | 'best_vapes') => {
      const { data: pages } = await supabase
        .from('content_pages')
        .select(
          'id, type, slug, cover_image, sort_order, created_at, content_page_translations(title, content, language, authors(id, name, avatar_url))',
        )
        .eq('type', type)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const matched: SearchArticleHit[] = [];
      for (const p of pages || []) {
        const translations = (p.content_page_translations || []) as Array<{
          title: string | null;
          content: string | null;
          language: string;
          authors: {
            id: number;
            name: string;
            avatar_url: string | null;
          } | null;
        }>;
        const t =
          translations.find((x) => x.language === language) ||
          translations.find((x) => x.language === 'en');
        const title = t?.title || '';
        if (title && matchWords(query, title)) {
          matched.push({
            id: p.id as number,
            type: p.type as string,
            slug: p.slug as string,
            cover_image: (p.cover_image as string | null) ?? null,
            sort_order: (p.sort_order as number) ?? 0,
            title,
            created_at: (p.created_at as string | null) ?? null,
            excerpt: makeExcerpt(t?.content ?? null),
            author: t?.authors
              ? {
                  id: t.authors.id,
                  name: t.authors.name,
                  avatar_url: t.authors.avatar_url ?? null,
                }
              : null,
          });
          if (matched.length >= 10) break;
        }
      }
      return matched;
    };

    const [news, bestVapes] = await Promise.all([
      fetchArticles('news'),
      fetchArticles('best_vapes'),
    ]);

    return { products, news, best_vapes: bestVapes };
  } catch {
    return EMPTY_RESULTS;
  }
}
