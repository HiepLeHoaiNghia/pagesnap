// plan-exempt — multi-page crawler and markdown merger
/**
 * PageSnap Multi-Page Crawler: sequentially discovers, fetches, and merges
 * paginated web documents into a single cohesive Markdown artifact.
 */

window.PageSnap = window.PageSnap || {};
window.Web2MD = window.Web2MD || window.PageSnap;

(function (PageSnap) {
  'use strict';

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Helper to extract content from an HTML string using DOMParser
   * @param {string} html
   * @param {string} pageUrl
   * @returns {{ title: string, content: string, url: string }}
   */
  PageSnap.extractContentFromHtmlString = function (html, pageUrl) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Pre-process DOM
      if (typeof PageSnap.preProcessDOMForConversion === 'function') {
        try {
          PageSnap.preProcessDOMForConversion(doc.body, doc);
        } catch (e) {}
      }

      // Check Smart Adapter first (e.g. Backlog, Jira, Github)
      if (typeof PageSnap.extractSmartTicketContent === 'function') {
        const smartResult = PageSnap.extractSmartTicketContent(doc, pageUrl);
        if (smartResult && smartResult.content) {
          return {
            title: smartResult.title || doc.title || 'Page',
            content: smartResult.content,
            url: pageUrl
          };
        }
      }

      // Fallback to Readability
      if (typeof Readability !== 'undefined') {
        const reader = new Readability(doc);
        const article = reader.parse();
        if (article && article.content) {
          return {
            title: article.title || doc.title || 'Page',
            content: article.content,
            url: pageUrl
          };
        }
      }

      // Fallback to body innerHTML
      return {
        title: doc.title || 'Page',
        content: doc.body ? doc.body.innerHTML : '',
        url: pageUrl
      };
    } catch (err) {
      return {
        title: 'Page',
        content: html,
        url: pageUrl
      };
    }
  };

  /**
   * Crawls up to maxDepth pages starting from initialData
   * @param {Object} options
   * @param {Object} options.initialData - Initial page extraction result
   * @param {number} [options.maxDepth=3] - Maximum pages to merge (1-5)
   * @param {Object} [options.settings={}] - Turndown conversion settings
   * @param {number} [options.delayMs=300] - Polite delay between fetches
   * @param {Function} [options.onProgress] - Progress callback
   * @returns {Promise<{ markdown: string, pagesCount: number, pages: Array }>}
   */
  PageSnap.crawlAndMergePages = async function (options = {}) {
    const {
      initialData,
      maxDepth = 3,
      settings = {},
      delayMs = 300,
      onProgress = () => {}
    } = options;

    if (!initialData || !initialData.content) {
      throw new Error('Initial page content is required for multi-page crawl');
    }

    const pages = [
      {
        pageNum: 1,
        title: initialData.title || document.title || 'Page 1',
        content: initialData.content,
        url: initialData.url || window.location.href
      }
    ];

    const visitedUrls = new Set([pages[0].url]);
    let nextCandidateUrl = null;

    // Discover next URL from the initial active document
    if (typeof PageSnap.findNextPageUrl === 'function') {
      nextCandidateUrl = PageSnap.findNextPageUrl(document, pages[0].url);
    }

    onProgress({
      current: 1,
      total: maxDepth,
      status: 'extracted_page_1',
      hasNext: !!nextCandidateUrl
    });

    // Crawl subsequent pages up to maxDepth
    while (pages.length < maxDepth && nextCandidateUrl) {
      if (visitedUrls.has(nextCandidateUrl)) {
        break; // Guard against circular loops
      }
      visitedUrls.add(nextCandidateUrl);

      const targetUrl = nextCandidateUrl;
      const targetPageNum = pages.length + 1;

      onProgress({
        current: targetPageNum,
        total: maxDepth,
        status: `fetching_page_${targetPageNum}`,
        url: targetUrl
      });

      // Polite rate-limit delay
      if (delayMs > 0) {
        await sleep(delayMs);
      }

// plan-exempt — resilient background fetch with direct fallback
      // Fetch HTML via background proxy with direct fetch fallback
      let fetchResult = null;
      try {
        fetchResult = await new Promise((resolve) => {
          let resolved = false;
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.id) {
            try {
              chrome.runtime.sendMessage(
                { action: 'fetchPageHtml', url: targetUrl },
                (response) => {
                  if (!resolved) {
                    resolved = true;
                    if (chrome.runtime.lastError || !response || !response.success) {
                      fetch(targetUrl)
                        .then(r => r.text().then(html => resolve({ success: true, html })))
                        .catch(() => resolve(null));
                    } else {
                      resolve(response);
                    }
                  }
                }
              );
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  fetch(targetUrl)
                    .then(r => r.text().then(html => resolve({ success: true, html })))
                    .catch(() => resolve(null));
                }
              }, 3000);
              return;
            } catch (e) {}
          }
          fetch(targetUrl)
            .then(r => r.text().then(html => resolve({ success: true, html })))
            .catch(() => resolve(null));
        });
      } catch (err) {
        break; // Stop on message failure
      }
      if (!fetchResult || !fetchResult.success || !fetchResult.html) {
        break; // Stop on network or HTTP error
      }

      // Extract content from fetched HTML string
      const extracted = PageSnap.extractContentFromHtmlString(fetchResult.html, targetUrl);
      pages.push({
        pageNum: targetPageNum,
        title: extracted.title,
        content: extracted.content,
        url: targetUrl
      });

      onProgress({
        current: targetPageNum,
        total: maxDepth,
        status: `extracted_page_${targetPageNum}`,
        url: targetUrl
      });

      // Discover next page URL from the newly parsed document
      try {
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(fetchResult.html, 'text/html');
        nextCandidateUrl = PageSnap.findNextPageUrl(parsedDoc, targetUrl);
      } catch (e) {
        nextCandidateUrl = null;
      }
    }

    // ─── Markdown Compilation & Merging ─────────────────────────────────────
    // Convert Page 1 with frontmatter
    let mergedMarkdown = '';
    if (typeof PageSnap.htmlToMarkdown === 'function') {
      mergedMarkdown = PageSnap.htmlToMarkdown(
        pages[0].content,
        {
          title: pages[0].title,
          url: pages[0].url,
          totalPagesMerged: pages.length
        },
        settings
      );

      // Append subsequent pages with distinct dividers and headings
      for (let i = 1; i < pages.length; i++) {
        const page = pages[i];
        const pageMd = PageSnap.htmlToMarkdown(
          page.content,
          { title: page.title, url: page.url },
          { ...settings, frontmatter: false }
        );

        mergedMarkdown += `\n\n---\n\n## Page ${page.pageNum}: ${page.title}\n[Source: ${page.url}]\n\n${pageMd}`;
      }
    } else {
      mergedMarkdown = pages.map(p => p.content).join('\n\n---\n\n');
    }

    return {
      markdown: mergedMarkdown,
      pagesCount: pages.length,
      pages: pages
    };
  };

})(window.PageSnap);
