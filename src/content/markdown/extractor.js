// plan-exempt — PageSnap Smart Adapter for Backlog and Issue Trackers
/**
 * PageSnap page content extraction: Mozilla Readability + Smart Issue Tracker Adapters.
 */

/**
 * Extracts structured ticket data for issue tracker pages (e.g. Backlog)
 */
PageSnap.extractSmartTicketContent = Web2MD.extractSmartTicketContent = function (doc, url = window.location.href) {
  const isBacklogUrl = /backlog\.(com|jp|tool\.com)/i.test(url);
  const backlogContainer = doc.querySelector('.ticket__inner, #issueArea, .ticket, #issue-view, .ticket__header');

  if (isBacklogUrl || backlogContainer) {
    // 1. Extract Ticket Key
    let key = '';
    const keyMatch = url.match(/\/view\/([A-Za-z0-9_-]+)/);
    if (keyMatch) {
      key = keyMatch[1];
    } else {
      const keyEl = doc.querySelector('.ticket__key-number, .ticket__key, #keyVal, [data-testid="issue-key"]');
      if (keyEl) key = keyEl.textContent.trim();
    }

    // 2. Extract Summary / Title
    let summary = '';
    const summaryEl = doc.querySelector('.ticket__title-summary, .title-group__title, #summary, h2.ticket__title');
    if (summaryEl) {
      summary = summaryEl.textContent.trim();
    } else {
      summary = doc.title || '';
    }

    const fullTitle = key ? `[${key}] ${summary}` : summary;

    // 3. Extract Properties
    const props = [];
    const statusEl = doc.querySelector('.status-tag, .ticket__status, [data-testid="status"]');
    if (statusEl) props.push(['Status', statusEl.textContent.trim()]);

    const priorityEl = doc.querySelector('.priority-tag, .ticket__priority, [data-testid="priority"]');
    if (priorityEl) props.push(['Priority', priorityEl.textContent.trim()]);

    const issueTypeEl = doc.querySelector('.ticket__issue-type, .issue-type-tag');
    if (issueTypeEl) props.push(['Issue Type', issueTypeEl.textContent.trim()]);

    const assigneeEl = doc.querySelector('.ticket__assignee, [data-testid="assignee"], .user-name');
    if (assigneeEl) props.push(['Assignee', assigneeEl.textContent.trim()]);

    const milestoneEl = doc.querySelector('.ticket__milestone, [data-testid="milestone"]');
    if (milestoneEl) props.push(['Milestone', milestoneEl.textContent.trim()]);

    const dueDateEl = doc.querySelector('.ticket__due-date, [data-testid="dueDate"]');
    if (dueDateEl) props.push(['Due Date', dueDateEl.textContent.trim()]);

    if (props.length === 0) {
      const propItems = doc.querySelectorAll('.ticket__properties dl, .ticket-properties dl, #issue-properties dl');
      propItems.forEach(dl => {
        const dt = dl.querySelector('dt');
        const dd = dl.querySelector('dd');
        if (dt && dd) {
          const k = dt.textContent.trim();
          const v = dd.textContent.trim();
          if (k && v) props.push([k, v]);
        }
      });
    }

    let propsTableHtml = '';
    if (props.length > 0) {
      const rows = props.map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join('');
      propsTableHtml = `<table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>\n\n`;
    }

    // 4. Extract Description
    let descHtml = '';
    const descEl = doc.querySelector('.ticket__description, .markdown-body, .ticket__body, #description, [data-testid="issue-description"]');
    if (descEl) {
      descHtml = descEl.innerHTML;
    }

// plan-exempt — subtasks table extraction
    // 4.5. Extract Subtasks / Child Issues Table
    let subtasksHtml = '';
    const subtaskTable = doc.querySelector('.subtask-list, table.issue-table, [data-testid="subtasks"], .ticket__child-issues, #child-issues-area table');
    if (subtaskTable) {
      subtasksHtml = `<h2>Subtasks</h2>\n${subtaskTable.outerHTML}\n\n`;
    }
    // 5. Extract Comments
    const commentNodes = doc.querySelectorAll('.ticket__comments .comment__item, .comment-list .comment, [data-testid="comment"]');
    let commentsHtml = '';
    if (commentNodes.length > 0) {
      const commentsList = [];
      commentNodes.forEach(cNode => {
        const authorEl = cNode.querySelector('.comment__author, .user-name, [data-testid="author"]');
        const dateEl = cNode.querySelector('.comment__date, time, .date, [data-testid="date"]');
        const bodyEl = cNode.querySelector('.comment__body, .markdown-body, .comment-content');

        const author = authorEl ? authorEl.textContent.trim() : 'Commenter';
        const date = dateEl ? dateEl.textContent.trim() : '';
        const body = bodyEl ? bodyEl.innerHTML : '';

        if (body.trim().length > 0) {
          commentsList.push(`<div><h3>${author} ${date ? `<em>(${date})</em>` : ''}</h3>${body}</div>`);
        }
      });

      if (commentsList.length > 0) {
        commentsHtml = `<h2>Comments (${commentsList.length})</h2>\n` + commentsList.join('\n<hr>\n');
      }
    }

    if (descHtml || propsTableHtml) {
      const structuredContent = `<div>
<h1>${fullTitle}</h1>
${propsTableHtml}
<h2>Description</h2>
<div>${descHtml || '<p><em>No description provided.</em></p>'}</div>
${subtasksHtml}
${commentsHtml}
</div>`;

      return {
        title: fullTitle,
        content: structuredContent,
        siteName: 'Backlog'
      };
    }
  }

  return null;
};

/**
 * Handles extracting page content cleanly.
 */
Web2MD.handleExtractContentRequest = function (sendResponse) {
  try {
    const result = Web2MD.extractPageContent();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
};

/**
 * Extracts clean article content using Mozilla Readability
 */
PageSnap.extractPageContent = Web2MD.extractPageContent = function () {
  // Clone DOM to prevent affecting the active page
  const docClone = document.cloneNode(true);
  const pageTitle = document.title || "Untitled Page";
  const pageUrl = window.location.href;
  const hasBody = document.body ? true : false;
  const visibleTextLength = document.body ? document.body.innerText.trim().length : 0;

  // Check Smart Adapters (e.g. Backlog, Jira)
  const smartTicket = Web2MD.extractSmartTicketContent(docClone, pageUrl);
  if (smartTicket) {
    return {
      title: smartTicket.title || pageTitle,
      content: smartTicket.content,
      rawContent: docClone.body ? docClone.body.innerHTML : "",
      visibleText: null,
      visibleTextLength: visibleTextLength,
      url: pageUrl,
      excerpt: "",
      byline: "",
      siteName: smartTicket.siteName || "Issue Tracker",
      success: true,
      readabilitySuccess: true
    };
  }

  try {
    Web2MD.preProcessDOMForConversion(docClone, document);
  } catch (err) {
    console.error("DOM pre-processing failed: ", err);
  }

  let article = null;
  let useRaw = false;
  try {
    // Readability is loaded via manifest content_scripts before content.js
    if (typeof Readability !== 'undefined') {
      const reader = new Readability(docClone);
      article = reader.parse();

      if (article) {
        const articleText = article.textContent ? article.textContent.trim() : "";
        const originalText = docClone.body ? docClone.body.innerText.trim() : "";

        // Heuristic: If Readability stripped out almost the entire page (less than 15% text remaining or < 200 chars remaining while original page is large),
        // we fallback to raw HTML representation to avoid losing important dashboard/application data.
        if (originalText.length > 500 && (articleText.length < 200 || (articleText.length / originalText.length) < 0.15)) {
          useRaw = true;
        }
      } else {
        useRaw = true;
      }
    } else {
      useRaw = true;
    }
  } catch (e) {
    console.error("Readability parsing failed: ", e);
    useRaw = true;
  }

// plan-exempt — remove duplicate declarations

  // Pre-extract visible form content for fallback (only if page is complex enough to need it)
  let visibleText = null;
  if (useRaw && visibleTextLength > 500) {
    try {
      visibleText = Web2MD.extractVisibleFormContent();
    } catch (e) {
      console.error("extractVisibleFormContent failed:", e);
    }
  }

  return {
    title: article ? (article.title || pageTitle) : pageTitle,
    content: (article && !useRaw) ? article.content : (docClone.body ? docClone.body.innerHTML : ""), // Clean article content
    rawContent: docClone.body ? docClone.body.innerHTML : "", // Full raw body HTML
    visibleText: visibleText, // Fallback: structured visible text for complex web apps
    visibleTextLength: visibleTextLength, // Length of body.innerText for ratio check
    url: pageUrl,
    excerpt: article ? (article.excerpt || "") : "",
    byline: article ? (article.byline || "") : "",
    siteName: article ? (article.siteName || new URL(pageUrl).hostname) : new URL(pageUrl).hostname,
    success: hasBody,
// plan-exempt — fix projectFiles ReferenceError
    readabilitySuccess: (article && !useRaw) ? true : false
  };
};

/**
 * Extracts visible text content from the live DOM, preserving form field values.
 * Used as a fallback when Turndown produces too little content from complex web app pages.
 */
Web2MD.extractVisibleFormContent = function () {
  const lines = [];
  const seen = new Set();

  const isVisible = (el) => {
    if (!el || el.nodeType !== 1) return true;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    } catch (e) {}
    return true;
  };

  const addLine = (text, allowDupe) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!allowDupe && seen.has(trimmed)) return;
    seen.add(trimmed);
    lines.push(trimmed);
  };

  const walkNode = (node, depth) => {
    if (depth > 100) return; // ExtJS DOMs can be 50+ levels deep
    if (node.nodeType === 1) {
      if (!isVisible(node)) return;
      const tag = node.tagName;
      const cls = (typeof node.className === 'string') ? node.className : '';

      // Skip non-content elements
      if (['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'LINK', 'META', 'HEAD'].includes(tag)) return;
      // Skip ExtJS masks/loading overlays
      if (cls.includes('x-mask') || cls.includes('x-load-mask') || cls.includes('x-splitter')) return;

      // Headings
      if (/^H[1-6]$/.test(tag)) {
        const text = node.textContent.trim();
        if (text) {
          const level = parseInt(tag[1]);
          addLine('#'.repeat(level) + ' ' + text);
        }
        return;
      }

      // Labels
      if (tag === 'LABEL' || cls.includes('x-form-item-label')) {
        const text = node.textContent.replace(/:$/, '').trim();
        if (text) addLine('**' + text + '**: ', true);
        return;
      }

      // ExtJS display fields (read-only text values)
      if (cls.includes('x-form-display-field')) {
        const text = node.textContent.trim();
        if (text) addLine(text, true);
        return;
      }

      // Buttons
      if (tag === 'BUTTON' || (tag === 'A' && cls.includes('x-btn')) || (tag === 'DIV' && cls.includes('x-btn'))) {
        const text = node.textContent.trim();
        if (text && text.length < 100) addLine('[ ' + text + ' ]');
        return;
      }

      // Tab headers
      if (cls.includes('x-tab') && !cls.includes('x-tab-bar') && !cls.includes('x-tabpanel')) {
        const text = node.textContent.trim();
        if (text && text.length < 100) addLine('### ' + text);
        return;
      }

      // Tree nodes
      if (cls.includes('x-tree-node-text') || cls.includes('x-grid-cell-inner')) {
        const text = node.textContent.trim();
        if (text) addLine('- ' + text, true);
        return;
      }

      // Form inputs
      if (tag === 'INPUT') {
        const type = (node.getAttribute('type') || 'text').toLowerCase();
        if (type === 'hidden') return;
        if (type === 'checkbox' || type === 'radio') {
          // Try to find associated label
          const formItem = node.closest('.x-form-item, .x-field');
          const label = formItem ? formItem.querySelector('.x-form-item-label, label') : null;
          const labelText = label ? label.textContent.replace(/:$/, '').trim() : '';
          const prefix = labelText ? labelText + ': ' : '';
          addLine(prefix + (node.checked ? '[x]' : '[ ]'), true);
        } else if (type === 'password') {
          addLine('[ •••••• ]', true);
        } else {
          const val = node.value || '';
          const role = node.getAttribute('role') || '';
          const isCombo = role === 'combobox' || cls.includes('x-form-combobox') || cls.includes('x-trigger-noedit');
          if (isCombo) {
            // Try to find label
            const formItem = node.closest('.x-form-item, .x-field');
            const label = formItem ? formItem.querySelector('.x-form-item-label, label') : null;
            const labelText = label ? label.textContent.replace(/:$/, '').trim() : '';
            const prefix = labelText ? labelText + ': ' : '';
            addLine(prefix + '[ ' + (val || ' ') + ' ▾ ]', true);
          } else if (val) {
            addLine('[ ' + val + ' ]', true);
          }
        }
        return;
      }

      if (tag === 'SELECT') {
        const selected = node.selectedIndex >= 0 && node.options[node.selectedIndex]
          ? node.options[node.selectedIndex].text.trim() : '';
        addLine('[ ' + (selected || ' ') + ' ▾ ]', true);
        return;
      }

      if (tag === 'TEXTAREA') {
        if (node.value) addLine('[ ' + node.value + ' ]', true);
        return;
      }

      // Recurse into children
      for (const child of node.childNodes) {
        walkNode(child, depth + 1);
      }
    } else if (node.nodeType === 3) {
      // Text node
      const text = node.textContent.trim();
      if (text && text.length > 0 && text.length < 500) {
        if (isVisible(node.parentElement)) {
          addLine(text, true);
        }
      }
    }
  };

  walkNode(document.body, 0);
  return lines.join('\n');
};
