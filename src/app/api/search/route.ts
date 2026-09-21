import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { runSearch } from '@/lib/server-search';

// GET /api/search?q=...&language=en&currency=$
// Unified global search: up to 10 products, 10 news and 10 best-vapes.
// Matching is by word spelling order (prefix), applied after a 2s client debounce.
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, 'public');
  if (!rl.allowed) return rateLimitResponse(rl.resetTime);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const language = searchParams.get('language') || 'en';
  const currency = searchParams.get('currency') || '$';

  if (!q) {
    return NextResponse.json({
      success: true,
      data: { products: [], news: [], best_vapes: [] },
    });
  }

  try {
    const data = await runSearch(q, language, currency, 10);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
