// plan-exempt — PageSnap branding update
/**
 * PageSnap markdown conversion message handlers (extract / selection / page / html-to-markdown).
 */

/**
 * Handle converting selection to Markdown and copying to clipboard
 */
async function handleSelectionConversion() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.toString().trim() === '') {
    Web2MD.showToast("⚠️ Please select text first!", true);
    return;
  }

  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  try {
    Web2MD.preProcessDOMForConversion(container, document);
  } catch (err) {
    console.error("Selection DOM pre-processing failed: ", err);
  }
  const selectedHtml = container.innerHTML;

  try {
    const settings = await Web2MD.getSettings();
    const metadata = {
      title: document.title,
      url: window.location.href,
      siteName: new URL(window.location.href).hostname
    };

    const markdown = Web2MD.htmlToMarkdown(selectedHtml, metadata, settings);
    await Web2MD.copyTextToClipboard(markdown);
    Web2MD.showToast("⚡ Selection copied as Markdown!");
  } catch (error) {
    console.error("Selection conversion failed: ", error);
    Web2MD.showToast("❌ Failed to copy selection", true);
  }
}

/**
 * Handle converting the whole page and copying to clipboard
 */
async function handlePageConversion() {
  try {
    const pageData = Web2MD.extractPageContent();
    const settings = await Web2MD.getSettings();

    const htmlToConvert = settings.rawMode ? pageData.rawContent : pageData.content;
    let markdown = Web2MD.htmlToMarkdown(htmlToConvert, pageData, settings);

    // Fallback: if Turndown produced very little content compared to visible page text,
    // use direct visible text extraction (critical for complex web apps like ExtJS)
    const visibleTextLength = document.body ? document.body.innerText.trim().length : 0;
    // Strip frontmatter to measure actual content length
    const contentOnly = markdown.replace(/^---[\s\S]*?---\s*/, '').trim();
    if (visibleTextLength > 500 && contentOnly.length < visibleTextLength * 0.15) {
      console.warn('[Web2MD] Turndown produced too little content (' + contentOnly.length + ' chars vs ' + visibleTextLength + ' visible chars). Using visible text fallback.');
      const fallbackContent = Web2MD.extractVisibleFormContent();
      if (fallbackContent.length > contentOnly.length) {
        // Re-add frontmatter if enabled
        if (settings.frontmatter) {
          const fm = [
            '---',
            `title: "${pageData.title.replace(/"/g, '\\"')}"`,
            `url: ${pageData.url}`,
            `date: ${new Date().toISOString().split('T')[0]}`,
            pageData.siteName ? `site: "${pageData.siteName.replace(/"/g, '\\"')}"` : null,
            '---',
            '',
            ''
          ].filter(val => val !== null).join('\n');
          markdown = fm + fallbackContent;
        } else {
          markdown = fallbackContent;
        }
      }
    }

    await Web2MD.copyTextToClipboard(markdown);
    Web2MD.showToast("⚡ Page copied as Markdown!");
  } catch (error) {
    console.error("Page conversion failed: ", error);
    Web2MD.showToast("❌ Failed to copy page", true);
  }
}

PageSnap.registerHandlers({
  extractContent: (request, sender, sendResponse) => {
    Web2MD.handleExtractContentRequest(sendResponse);
    return true;
  },
  convertSelection: (request, sender, sendResponse) => {
    handleSelectionConversion();
    return true;
  },
  convertPage: (request, sender, sendResponse) => {
    handlePageConversion();
    return true;
  },
  convertHtmlToMarkdown: (request, sender, sendResponse) => {
    try {
      const markdown = Web2MD.htmlToMarkdown(request.html, request.metadata, request.settings);
      sendResponse({ success: true, markdown: markdown });
// plan-exempt — fix try catch closing
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
}); // plan-exempt — clean markdown handlers without in-tab synthetic download
