/**
 * Web2MD Turndown configuration: converts HTML to Markdown with custom rules.
 * No chrome.* dependency — settings/metadata are passed in as arguments so this
 * file can also be loaded standalone (e.g. by popup.html).
 */

/**
 * Converts HTML string to Markdown based on current settings
 */
Web2MD.htmlToMarkdown = function (html, metadata, settings) {
  if (typeof TurndownService === 'undefined') {
    throw new Error("TurndownService not loaded");
  }

  const turndownService = new TurndownService({
    headingStyle: settings.headingStyle,
    hr: '---',
    bulletListMarker: settings.bulletStyle,
    codeBlockStyle: settings.codeBlockStyle,
    emDelimiter: '*',
    strongDelimiter: '**',
    br: '  '
  });

  // Use GitHub Flavored Markdown plugin if loaded
  if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
    turndownService.use(turndownPluginGfm.gfm);
  }

  // Remove unwanted elements (but preserve buttons, forms, and nav text content)
  turndownService.remove(['script', 'style', 'iframe', 'noscript']);

  // Rule to ignore elements marked for deletion/suppression
  turndownService.addRule('ignoreProcessed', {
    filter: (node) => node.getAttribute && node.getAttribute('data-web2md-ignore') === 'true',
    replacement: () => ''
  });

  // Custom Monaco Editor rule to preserve code formatting
  turndownService.addRule('monacoEditor', {
    filter: (node) => node.classList && node.classList.contains('monaco-editor'),
    replacement: (content, node) => {
      const lines = node.querySelectorAll('.view-line');
      if (lines.length === 0) return '';

      const codeLines = Array.from(lines).map(line => line.textContent || '');
      const codeText = codeLines.join('\n');

      // Try to find the file extension from active tabs/headers
      let language = '';
      const activeTab = document.querySelector('.tab.active, .editor-tab.active, [class*="active-tab"], [class*="tab-active"]');
      if (activeTab) {
        const name = activeTab.textContent.trim();
        const ext = name.split('.').pop();
        if (ext && ext.length < 10) language = ext;
      }

      return `\n\n\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
    }
  });

  // Custom code block rule with language detection
  turndownService.addRule('fencedCodeBlock', {
    filter: (node) => node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
    replacement: (content, node, options) => {
      const code = node.firstChild;
      const className = code.getAttribute('class') || '';
      const language = (className.match(/language-(\S+)/) || [null, ''])[1];
      const text = code.textContent;
      const fenceChar = options.codeBlockStyle === 'indented' ? '    ' : '```';

      if (fenceChar === '    ') {
        return '\n\n    ' + text.replace(/\n/g, '\n    ') + '\n\n';
      }
      return `\n\n\`\`\`${language}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
    }
  });

  // Custom image rule to strip images if disabled and filter transparent/spacer images
  turndownService.addRule('imageFilter', {
    filter: 'img',
    replacement: (content, node) => {
      if (!settings.includeImages) return '';
      const src = node.getAttribute('src') || '';
      const width = node.getAttribute('width') || '';
      const height = node.getAttribute('height') || '';

      // Filter out transparent 1x1 base64 GIFs/PNGs and tiny spacer pixels
      if (!src || src.includes('data:image/gif;base64,R0lGODlhAQABA') || src.includes('data:image/png;base64,iVBORw0KGgoAAA') || width === '1' || height === '1') {
        return '';
      }

      const alt = node.getAttribute('alt') || 'image';
      const title = node.getAttribute('title') ? ` "${node.getAttribute('title')}"` : '';
      return src ? `![${alt}](${src}${title})` : '';
    }
  });

  // Custom link rule to strip link markup if disabled or formatting as Obsidian wikilink
  turndownService.addRule('linkFilter', {
    filter: 'a',
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      if (!href) return content;

      if (!settings.includeLinks) return content;

      if (settings.obsidianMode) {
        // If it's a relative/anchor link or internal wiki-style link
        if (href.startsWith('#') || !href.startsWith('http')) {
          const cleanHref = decodeURIComponent(href.replace(/^\.\//, ''));
          return `[[${cleanHref}${content && content !== cleanHref ? '|' + content : ''}]]`;
        }
      }

      const title = node.getAttribute('title') ? ` "${node.getAttribute('title')}"` : '';
      return `[${content}](${href}${title})`;
    }
  });

  // Custom table rule to handle data grids (headerless or normal) and form layouts
  turndownService.addRule('tableFilter', {
    filter: 'table',
    replacement: (content, node) => {
      // 1. Detect if it is a layout table containing inputs
      if (Web2MD.isLayoutTable(node)) {
        // Let's get the direct rows of this table
        const directRows = Array.from(node.querySelectorAll('tr')).filter(tr => tr.closest('table') === node);

        const formatNodeInline = (el) => {
          // Ignore hidden inputs
          if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') {
            return null;
          }

          // Ignore elements hidden by inline style on themselves or parents
          let parent = el;
          while (parent && parent !== node) {
            const styleAttr = parent.getAttribute('style') || '';
            if (styleAttr.includes('display: none') || styleAttr.includes('display:none') ||
                styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
              return null;
            }
            parent = parent.parentElement;
          }

          if (el.tagName === 'BUTTON' || el.classList.contains('x-btn')) {
            const btnText = el.textContent.trim();
            if (el.querySelector('[class*="plus"]') || btnText === '+') return '[ + ]';
            if (el.querySelector('[class*="close"]') || el.querySelector('[class*="remove"]') || btnText === 'x' || btnText === '×') return '[ ✖ ]';
            return `[ ${btnText || 'Button'} ]`;
          }

          if (el.tagName === 'LABEL' || el.classList.contains('x-form-item-label')) {
            return `**${el.textContent.replace(/:$/, '').trim()}**:`;
          }

          if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            const type = el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : 'text';
            if (type === 'checkbox' || type === 'radio') {
              return el.checked ? '[x]' : '[ ]';
            }
            const val = el.value || el.getAttribute('value') || '';
            const isSelect = el.tagName === 'SELECT' ||
                             el.getAttribute('role') === 'combobox' ||
                             el.classList.contains('x-form-combobox') ||
                             (el.closest('.x-field') && el.closest('.x-field').querySelector('[class*="trigger"]') !== null);
            if (isSelect) {
              let selectedText = val;
              let optionsList = [];

              if (el.tagName === 'SELECT') {
                if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
                  selectedText = el.options[el.selectedIndex].text.trim();
                }
                optionsList = Array.from(el.options).map(opt => opt.text.trim());
              } else {
                // Query live DOM for custom combobox options
                const realEl = el.id ? document.getElementById(el.id) : null;
                const targetEl = realEl || el;
                if (targetEl.value) {
                  selectedText = targetEl.value;
                } else if (targetEl.getAttribute('value')) {
                  selectedText = targetEl.getAttribute('value');
                } else {
                  selectedText = targetEl.textContent.trim();
                }

                const comboId = targetEl.id || '';
                let pickerEl = null;
                if (comboId) {
                  const pickerId = comboId.replace('-inputEl', '').replace('-input', '') + '-picker';
                  pickerEl = document.getElementById(pickerId) || document.querySelector(`[id*="${comboId.replace('-inputEl', '').replace('-input', '')}"]`);
                }
                if (!pickerEl) {
                  const ariaOwns = targetEl.getAttribute('aria-owns') || targetEl.getAttribute('aria-controls');
                  if (ariaOwns) {
                    pickerEl = document.getElementById(ariaOwns);
                  }
                }
                if (pickerEl) {
                  const items = pickerEl.querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"], li');
                  optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
                }
                if (optionsList.length === 0) {
                  const activeLists = document.querySelectorAll('.x-boundlist:not([style*="display: none"]), .x-combo-list:not([style*="display: none"])');
                  if (activeLists.length === 1) {
                    const items = activeLists[0].querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"]');
                    optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
                  }
                }
              }

              if (optionsList.length > 0) {
                return `[ ${selectedText || ' '} ▾ ] (${optionsList.join(' | ')})`;
              }
              return `[ ${selectedText || ' '} ▾ ]`;
            }
            return `[ ${val || '    '} ]`;
          }

          return null;
        };

        const getLeafNodes = (root) => {
          const leaves = [];
          const walk = (n) => {
            if (n.nodeType === 3) { // Text Node
              if (n.textContent.trim()) {
                leaves.push(n);
              }
              return;
            }
            if (n.nodeType === 1) { // Element Node
              const tagName = n.tagName;
              if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA' || tagName === 'BUTTON' ||
                  n.classList.contains('x-btn') || n.classList.contains('x-form-item-label') || tagName === 'LABEL') {
                leaves.push(n);
                return;
              }
              n.childNodes.forEach(walk);
            }
          };
          root.childNodes.forEach(walk);
          return leaves;
        };

        const rowsCols = [];
        directRows.forEach(row => {
          const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
          const colTexts = [];

          cols.forEach(col => {
            // Check if this column contains a nested table
            const nestedTable = col.querySelector('table');
            if (nestedTable) {
              // Recursively convert the nested table using the same rule logic, but strip newlines so it stays inline!
              const nestedMarkdown = turndownService.turndown(nestedTable.outerHTML).trim();
              if (nestedMarkdown) {
                colTexts.push(nestedMarkdown.replace(/\n+/g, ' '));
              }
            } else {
              // No nested table: format the contents of this column inline
              const leaves = getLeafNodes(col);
              if (leaves.length > 0) {
                const formattedItems = [];
                leaves.forEach(leaf => {
                  if (leaf.nodeType === 3) {
                    const txt = leaf.textContent.trim();
                    if (txt) {
                      formattedItems.push({ type: 'text', value: txt, text: txt });
                    }
                  } else {
                    const formatted = formatNodeInline(leaf);
                    if (formatted) {
                      formattedItems.push({ type: 'interactive', value: formatted, text: (leaf.value || leaf.textContent || '').trim() });
                    } else {
                      const txt = leaf.textContent.trim();
                      if (txt) {
                        formattedItems.push({ type: 'text', value: txt, text: txt });
                      }
                    }
                  }
                });

                // Deduplicate items in this column
                const filteredItems = [];
                formattedItems.forEach((item, idx) => {
                  if (item.type === 'text') {
                    const isDuplicate = formattedItems.some((other, oIdx) => {
                      if (other.type === 'interactive') {
                        const val = (other.text || '').trim();
                        return val.includes(item.text) || item.text.includes(val);
                      }
                      if (other.type === 'text' && oIdx < idx) {
                        return other.text === item.text;
                      }
                      return false;
                    });
                    if (isDuplicate) return;
                  } else {
                    const isDuplicate = formattedItems.some((other, oIdx) => {
                      return other.type === 'interactive' && oIdx < idx && other.value === item.value;
                    });
                    if (isDuplicate) return;
                  }
                  filteredItems.push(item.value);
                });

                if (filteredItems.length > 0) {
                  colTexts.push(filteredItems.join(' '));
                }
              }
            }
          });

          if (colTexts.length > 0) {
            rowsCols.push(colTexts);
          }
        });

        // Find max length of Col 0 for rows with >= 2 columns
        let maxCol0Len = 0;
        rowsCols.forEach(cols => {
          if (cols.length > 1) {
            const col0Len = cols[0].length;
            if (col0Len > maxCol0Len) {
              maxCol0Len = col0Len;
            }
          }
        });

        let tableText = '';
        rowsCols.forEach(cols => {
          if (cols.length > 1) {
            const paddedCol0 = cols[0] + ' '.repeat(maxCol0Len - cols[0].length);
            tableText += [paddedCol0, ...cols.slice(1)].join('  ') + '\n';
          } else if (cols.length === 1) {
            tableText += cols[0] + '\n';
          }
        });

        return '\n\n' + tableText.trim() + '\n\n';
      }

      // 2. Data table formatting into clean Markdown tables
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      let maxCols = 0;
      let hasRealThHeader = false;
      const tableData = [];

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td')).map(cell => {
          return cell.textContent.replace(/\s+/g, ' ').replace(/\xa0/g, ' ').trim();
        });

        // Filter out completely empty rows (sizers)
        if (cells.length === 0 || cells.every(cell => cell === '')) {
          return;
        }

        if (cells.length > maxCols) maxCols = cells.length;

        // Check if this row actually has a th element (meaning it's a header row)
        if (row.querySelector('th') !== null) {
          hasRealThHeader = true;
        }

        tableData.push(cells);
      });

      if (tableData.length === 0) return '';

      let markdownTable = '\n\n';
      let headers = [];
      let startIdx = 0;

      if (hasRealThHeader) {
        headers = tableData[0];
        startIdx = 1;
        if (headers.length > maxCols) {
          headers = headers.slice(0, maxCols);
        } else {
          while (headers.length < maxCols) {
            headers.push('');
          }
        }
      } else {
        let headerTexts = [];
        let foundHeaders = false;

        // Helper to extract texts from a header container
        const extractTexts = (container) => {
          let cells = Array.from(container.querySelectorAll('.x-column-header-text'));
          if (cells.length === 0) {
            cells = Array.from(container.querySelectorAll('.x-column-header'));
          }
          if (cells.length === 0) {
            cells = Array.from(container.querySelectorAll('th, td'));
          }
          return cells.map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        };

        // 1. Try to find header container in the temporary parsed tree (so we can also ignore it)
        let tempParent = node.parentElement;
        let tempHeaderContainer = null;
        while (tempParent) {
          tempHeaderContainer = tempParent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"], thead');
          if (tempHeaderContainer && tempHeaderContainer !== node.querySelector('thead')) {
            break;
          }
          tempParent = tempParent.parentElement;
        }

        if (tempHeaderContainer) {
          headerTexts = extractTexts(tempHeaderContainer);
          if (headerTexts.length > 0) {
            headers = headerTexts;
            foundHeaders = true;
            tempHeaderContainer.setAttribute('data-web2md-ignore', 'true');
          }
        }

        // 2. Fallback: If not found in temporary tree, find the corresponding real node in live DOM
        if (!foundHeaders) {
          const getRealElement = (tempNode) => {
            if (!tempNode) return null;
            if (tempNode.id) {
              const real = document.getElementById(tempNode.id);
              if (real) return real;
            }
            if (tempNode.className) {
              const selector = tempNode.tagName.toLowerCase() + '.' + Array.from(tempNode.classList).join('.');
              try {
                const candidates = Array.from(document.querySelectorAll(selector));
                if (candidates.length === 1) return candidates[0];
                for (const cand of candidates) {
                  if (cand.textContent.trim().substring(0, 50) === tempNode.textContent.trim().substring(0, 50)) {
                    return cand;
                  }
                }
              } catch (e) {}
            }
            return null;
          };

          const realNode = getRealElement(node);
          if (realNode) {
            let liveParent = realNode.parentElement;
            let liveHeaderContainer = null;
            while (liveParent && liveParent !== document.body) {
              liveHeaderContainer = liveParent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"], thead');
              if (liveHeaderContainer && liveHeaderContainer !== realNode.querySelector('thead')) {
                break;
              }
              liveParent = liveParent.parentElement;
            }

            if (liveHeaderContainer) {
              headerTexts = extractTexts(liveHeaderContainer);
              if (headerTexts.length > 0) {
                headers = headerTexts;
                foundHeaders = true;
              }
            }
          }
        }

        if (foundHeaders) {
          if (headers.length > maxCols) {
            headers = headers.slice(0, maxCols);
          } else {
            while (headers.length < maxCols) {
              headers.push('');
            }
          }

          // Check if headers match the first row in tableData
          let headersMatchFirstRow = false;
          if (tableData.length > 0) {
            const firstRowNormalized = tableData[0].map(c => c.toLowerCase());
            const headersNormalized = headers.map(c => c.toLowerCase());
            headersMatchFirstRow = (firstRowNormalized.length === headersNormalized.length) &&
                                   firstRowNormalized.every((val, idx) => val === headersNormalized[idx]);
          }
          if (headersMatchFirstRow) {
            startIdx = 1;
          } else {
            startIdx = 0;
          }
        } else {
          headers = Array(maxCols).fill('');
          startIdx = 0;
        }
      }

      markdownTable += '| ' + headers.map(h => h || ' ').join(' | ') + ' |\n';
      markdownTable += '| ' + Array(maxCols).fill('---').join(' | ') + ' |\n';

      for (let i = startIdx; i < tableData.length; i++) {
        const row = tableData[i];
        while (row.length < maxCols) row.push('');
        markdownTable += '| ' + row.map(cell => cell || ' ').join(' | ') + ' |\n';
      }

      return markdownTable + '\n';
    }
  });

  // Parse the input HTML string into a temporary DOM tree for preprocessing
  let preprocessedHtml = html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Look for all tables inside the parsed tree
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      // Find if there's an external header container in the parsed tree
      let parent = table.parentElement;
      let headerContainer = null;
      while (parent) {
        headerContainer = parent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"]');
        if (headerContainer && !table.contains(headerContainer)) {
          break;
        }
        parent = parent.parentElement;
      }

      if (headerContainer) {
        headerContainer.setAttribute('data-web2md-ignore', 'true');
      }
    });

    // Flag loaders, masks, and loading messages
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      const cls = el.className || '';
      const id = el.id || '';
      const text = el.textContent ? el.textContent.trim() : '';

      if (
        text === 'Loading...' ||
        (typeof cls === 'string' && (cls.includes('x-mask') || cls.includes('loading') || cls.includes('loadmask'))) ||
        (typeof id === 'string' && (id.includes('mask') || id.includes('loading')))
      ) {
        el.setAttribute('data-web2md-ignore', 'true');
      }
    });

    preprocessedHtml = doc.body.innerHTML;
  } catch (e) {
    console.error("Error preprocessing HTML for Turndown:", e);
  }

  let markdown = turndownService.turndown(preprocessedHtml);

  // Post-processing cleaning
  markdown = markdown.replace(/\xa0/g, ' '); // Convert non-breaking spaces to standard spaces
  markdown = markdown.replace(/^[ \t]+$/gm, ''); // Strip trailing/empty line spaces
  markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  markdown = markdown.trim();

  // Add YAML frontmatter if enabled
  if (settings.frontmatter && metadata) {
    const fm = [
      '---',
      `title: "${metadata.title.replace(/"/g, '\\"')}"`,
      `url: ${metadata.url}`,
      `date: ${new Date().toISOString().split('T')[0]}`,
      metadata.byline ? `author: "${metadata.byline.replace(/"/g, '\\"')}"` : null,
      metadata.siteName ? `site: "${metadata.siteName.replace(/"/g, '\\"')}"` : null,
      '---',
      '',
      ''
    ].filter(val => val !== null).join('\n');
    markdown = fm + markdown;
  }

  return markdown;
};
