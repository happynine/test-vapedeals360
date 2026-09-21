'use client';

import Link from 'next/link';
import { getImageUrl } from '@/lib/image-url';

export interface ProductHit {
  slug: string;
  name: string;
  image_url: string | null;
  price: string | null;
}
export interface ArticleHit {
  slug: string;
  title: string;
}
export interface SearchData {
  products: ProductHit[];
  news: ArticleHit[];
  best_vapes: ArticleHit[];
}

interface SearchDropdownContentProps {
  loading: boolean;
  data: SearchData;
  query: string;
  zh: boolean;
  onNavigate: () => void;
}

export function SearchDropdownContent({
  loading,
  data,
  query,
  zh,
  onNavigate,
}: SearchDropdownContentProps) {
  const { products, news, best_vapes } = data;
  const total = products.length + news.length + best_vapes.length;

  const sectionLabel = (text: string) => (
    <div className="sticky top-0 z-10 bg-[#1a1a24]/95 backdrop-blur px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-purple-400">
      {text}
    </div>
  );

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-400">
            {zh ? '匹配中…' : 'Matching…'}
          </span>
        </div>
      ) : total === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">
          {zh ? '未找到相关结果' : 'No matching results'}
        </div>
      ) : (
        <>
          {products.length > 0 && (
            <div>
              {sectionLabel(zh ? '产品' : 'Products')}
              {products.map((product) => (
                <Link
                  key={`p-${product.slug}`}
                  href={`/product/${product.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a2a3a] transition-colors"
                >
                  <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-white overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">No img</span>
                    )}
                  </div>
                  <span className="flex-1 min-w-0 text-sm text-white truncate">{product.name}</span>
                  {product.price && (
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums flex-shrink-0">
                      {product.price.startsWith('$') || product.price.startsWith('CA$')
                        ? product.price
                        : `$${product.price}`}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {best_vapes.length > 0 && (
            <div>
              {sectionLabel('Best Vapes')}
              {best_vapes.map((article) => (
                <Link
                  key={`bv-${article.slug}`}
                  href={`/best-vapes/${article.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a2a3a] transition-colors"
                >
                  <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">
                    {article.title}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {news.length > 0 && (
            <div>
              {sectionLabel(zh ? '新闻' : 'News')}
              {news.map((article) => (
                <Link
                  key={`n-${article.slug}`}
                  href={`/news/${article.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#2a2a3a] transition-colors"
                >
                  <span className="flex-1 min-w-0 text-sm text-gray-200 truncate">
                    {article.title}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* View More -> full search results page */}
          <Link
            href={`/?search=${encodeURIComponent(query.trim())}`}
            onClick={onNavigate}
            className="block border-t border-gray-800 px-4 py-3 text-center text-sm font-medium text-purple-400 hover:bg-[#2a2a3a] transition-colors"
          >
            {zh ? '查看更多结果' : 'View More'}
          </Link>
        </>
      )}
    </>
  );
}
