// plan-exempt — smart pagination detector module
/**
 * PageSnap Pagination Detector: discovers candidate next-page URLs from
 * DOM semantic tags, pagination controls, button labels, and URL patterns.
 */

window.PageSnap = window.PageSnap || {};
window.Web2MD = window.Web2MD || window.PageSnap;

(function (PageSnap) {
  'use strict';

  /**
   * Discovers the next page URL relative to currentUrl
   * @param {Document|Element} doc
   * @param {string} currentUrl
   * @returns {string|null} Resolved absolute URL of next page or null
   */
  PageSnap.findNextPageUrl = function (doc = document, currentUrl = window.location.href) {
    if (!doc) return null;

    // Helper to safely resolve valid absolute HTTP(S) URL
    function resolveValidUrl(rawHref) {
      if (!rawHref || typeof rawHref !== 'string') return null;
      const trimmed = rawHref.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:')) return null;

      try {
        const resolved = new URL(trimmed, currentUrl);
        // Only accept HTTP or HTTPS protocols
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
        // Don't treat exact same URL (with same query and path) as next page
        if (resolved.href === currentUrl || (resolved.origin === new URL(currentUrl).origin && resolved.pathname === new URL(currentUrl).pathname && resolved.search === new URL(currentUrl).search)) {
          return null;
        }
        return resolved.href;
      } catch (e) {
        return null;
      }
    }

    // ─── 1. Semantic SEO rel="next" Links ──────────────────────────────────
    const linkNext = doc.querySelector('link[rel="next"], a[rel~="next"]');
    if (linkNext) {
      const url = resolveValidUrl(linkNext.getAttribute('href'));
      if (url) return url;
    }

    // ─── 2. Standard Pagination Container Active + Next Sibling ────────────
    const paginationContainers = doc.querySelectorAll(
      '.pagination, .pager, .paginate, [class*="pagination" i], [class*="pager" i], nav[aria-label*="pagination" i], [data-testid*="pagination" i]'
    );

    for (const container of paginationContainers) {
      // Find active page indicator
      const activeEl = container.querySelector(
        '.active, .current, .selected, [aria-current="page"], [aria-current="true"]'
      );

      if (activeEl) {
        let sibling = activeEl.nextElementSibling;
        while (sibling) {
          const a = sibling.tagName === 'A' ? sibling : sibling.querySelector('a');
          if (a) {
            const url = resolveValidUrl(a.getAttribute('href'));
            if (url) return url;
          }
          sibling = sibling.nextElementSibling;
        }
      }

      // Check explicit Next links within container
      const containerNextLinks = container.querySelectorAll('a');
      for (const a of containerNextLinks) {
        const text = (a.textContent || '').trim().toLowerCase();
        const aria = (a.getAttribute('aria-label') || '').toLowerCase();
        const cls = (a.className || '').toLowerCase();

        if (
          text.includes('next') || text.includes('tiếp') || text.includes('sau') ||
          text === '›' || text === '»' || text === '>' ||
          aria.includes('next') || aria.includes('tiếp') ||
          cls.includes('next') || cls.includes('forward')
        ) {
          const url = resolveValidUrl(a.getAttribute('href'));
          if (url) return url;
        }
      }
    }

    // ─── 3. Document-wide Next Button / Link Matchers ───────────────────────
    const candidateLinks = doc.querySelectorAll('a[href]');
    for (const a of candidateLinks) {
      const text = (a.textContent || '').trim().toLowerCase();
      const aria = (a.getAttribute('aria-label') || '').toLowerCase();
      const rel = (a.getAttribute('rel') || '').toLowerCase();

      // Strong next match keywords
      const isNextWord = /^(next(\s+(page|step|results))?|tiếp(\s+theo)?|trang\s*sau|sau|›|»|>)$/i.test(text);
      const isNextAria = /^(next(\s+page)?|trang\s*(kế|tiếp|sau))$/i.test(aria);

      if (isNextWord || isNextAria || rel === 'next') {
        const url = resolveValidUrl(a.getAttribute('href'));
        if (url) return url;
      }
    }

    // ─── 4. URL Pattern Increment Fallback ──────────────────────────────────
    try {
      const parsedUrl = new URL(currentUrl);
      const searchParams = parsedUrl.searchParams;
      const paginationKeys = ['page', 'p', 'pageNum', 'page_num', 'pageIndex', 'page_number'];

      for (const key of paginationKeys) {
        if (searchParams.has(key)) {
          const val = parseInt(searchParams.get(key), 10);
          if (!isNaN(val) && val >= 1) {
            searchParams.set(key, String(val + 1));
            return parsedUrl.href;
          }
        }
      }

      // Path pattern match: /page/1 or /p/1
      const pathMatch = parsedUrl.pathname.match(/(\/(?:page|p)\/)(\d+)(\/?.*)$/i);
      if (pathMatch) {
        const prefix = pathMatch[1];
        const pageNum = parseInt(pathMatch[2], 10);
        const suffix = pathMatch[3] || '';
        if (!isNaN(pageNum) && pageNum >= 1) {
          parsedUrl.pathname = parsedUrl.pathname.replace(
            pathMatch[0],
            `${prefix}${pageNum + 1}${suffix}`
          );
          return parsedUrl.href;
        }
      }
    } catch (e) {}

    return null;
  };

})(window.PageSnap);
