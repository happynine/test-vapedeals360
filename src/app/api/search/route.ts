import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { fetchProducts } from '@/lib/database';

// GET /api/search?q=...&language=en&currency=$
// Unified global search: up to 10 products, 10 news and 10 best-vapes.
export const runtime = 'nodejs';

function displayPrice(p: Record<string, unknown>): number {
  const raw =
    p.promotion_id != null && p.promo_price != null && p.promo_price !== ''
      ? p.promo_price
      : p.current_price;
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? Infinity : n;
}

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, 'public');
  if (!rl.allowed) return rateLimitResponse(rl.resetTime);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const language = searchParams.get('language') || 'en';
  const currency = searchParams.get('currency') || '$';

  if (!q) {
    return NextResponse.json({ success: true, data: { products: [], news: [], best_vapes: [] } });
  }

  const supabase = getSupabaseClient();

  try {
    // ---- Products (reuse canonical fetch logic: filters active prices + currency) ----
    let products: Array<{
      slug: string;
      name: string;
      image_url: string | null;
      price: string | null;
    }> = [];
    try {
      const list = (await fetchProducts({
        language,
        limit: 10,
        offset: 0,
        search: q,
        currency,
      })) as Record<string, unknown>[];
      products = list.slice(0, 10).map((product) => {
        const translations = (product.translations as Array<{ language: string; name: string }>) || [];
        const t =
          translations.find((x) => x.language === language) ||
          translations.find((x) => x.language === 'en') ||
          translations[0];
        const prices = (product.prices as Record<string, unknown>[]) || [];
        const priced = prices.filter((p) => displayPrice(p) !== Infinity);
        let lowest: Record<string, unknown> | null = null;
        if (priced.length > 0) {
          lowest = priced.reduce((min, p) => (displayPrice(p) < displayPrice(min) ? p : min), priced[0]);
        }
        return {
          slug: product.slug as string,
          name: t?.name || '',
          image_url: (product.image_url as string | null) ?? null,
          price: lowest ? String(
            lowest.promotion_id != null && lowest.promo_price != null && lowest.promo_price !== ''
              ? lowest.promo_price
              : lowest.current_price,
          ) : null,
        };
      });
    } catch {
      products = [];
    }

    // ---- News / Best Vapes: title match only ----
    const fetchArticles = async (type: 'news' | 'best_vapes') => {
      const { data: pages } = await supabase
        .from('content_pages')
        .select('slug, content_page_translations(title, language)')
        .eq('type', type)
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .limit(60);

      const matched: Array<{ slug: string; title: string }> = [];
      const needle = q.toLowerCase();
      for (const p of pages || []) {
        const translations = (p.content_page_translations || []) as Array<{
          title: string | null;
          language: string;
        }>;
        const t =
          translations.find((x) => x.language === language) ||
          translations.find((x) => x.language === 'en');
        const title = t?.title || '';
        if (title && title.toLowerCase().includes(needle)) {
          matched.push({ slug: p.slug, title });
          if (matched.length >= 10) break;
        }
      }
      return matched;
    };

    const [news, bestVapes] = await Promise.all([
      fetchArticles('news'),
      fetchArticles('best_vapes'),
    ]);

    return NextResponse.json({
      success: true,
      data: { products, news, best_vapes: bestVapes },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
