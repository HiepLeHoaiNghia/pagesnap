/**
 * Web2MD DOM preprocessing pipeline applied before Readability/Turndown conversion.
 */

/**
 * Synchronizes current values of input, select, textarea elements from original DOM to cloned DOM
 */
function syncFormValues(originalDoc, clonedNode) {
  const clonedInputs = Array.from(clonedNode.querySelectorAll('input, select, textarea'));
  clonedInputs.forEach(clone => {
    let orig = null;
    if (clone.id) {
      orig = originalDoc.getElementById(clone.id);
    }
    if (!orig) return;

    if (orig.tagName === 'INPUT') {
      const type = (orig.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        clone.checked = orig.checked;
        if (orig.checked) {
          clone.setAttribute('checked', 'checked');
        } else {
          clone.removeAttribute('checked');
        }
      } else {
        clone.value = orig.value;
        clone.setAttribute('value', orig.value);
      }
    } else if (orig.tagName === 'TEXTAREA') {
      clone.value = orig.value;
      clone.textContent = orig.value;
    } else if (orig.tagName === 'SELECT') {
      clone.selectedIndex = orig.selectedIndex;
      const origOptions = orig.options;
      const cloneOptions = clone.options;
      if (origOptions && cloneOptions) {
        const minOpts = Math.min(origOptions.length, cloneOptions.length);
        for (let j = 0; j < minOpts; j++) {
          if (origOptions[j].selected) {
            cloneOptions[j].setAttribute('selected', 'selected');
          } else {
            cloneOptions[j].removeAttribute('selected');
          }
        }
      }
    }
  });
}

/**
 * Preprocesses all form controls globally in the cloned DOM, replacing them with static text representations
 */
function preProcessFormControls(rootNode, originalDoc) {
  const doc = rootNode.ownerDocument || rootNode;
  const candidates = Array.from(rootNode.querySelectorAll('input, select, textarea, button, .x-btn, .x-form-item-label, label'));

  candidates.forEach(el => {
    if (!el.parentNode) return;

    // Ignore hidden inputs
    if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') {
      el.parentNode.removeChild(el);
      return;
    }

    // Check if element is hidden by style
    let parent = el;
    let isHidden = false;
    while (parent && parent !== rootNode) {
      const styleAttr = parent.getAttribute && parent.getAttribute('style') || '';
      if (styleAttr.includes('display: none') || styleAttr.includes('display:none') ||
          styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
        isHidden = true;
        break;
      }
      parent = parent.parentNode;
    }
    if (isHidden) {
      el.parentNode.removeChild(el);
      return;
    }

    let replacementText = '';

    if (el.tagName === 'BUTTON' || el.classList.contains('x-btn')) {
      const btnText = el.textContent.trim();
      if (el.querySelector('[class*="plus"]') || btnText === '+') {
        replacementText = '[ + ]';
      } else if (el.querySelector('[class*="close"]') || el.querySelector('[class*="remove"]') || btnText === 'x' || btnText === '×') {
        replacementText = '[ ✖ ]';
      } else {
        replacementText = `[ ${btnText || 'Button'} ]`;
      }
    }
    else if (el.tagName === 'LABEL' || el.classList.contains('x-form-item-label')) {
      const labelText = el.textContent.replace(/:$/, '').trim();
      if (labelText) {
        const strongEl = doc.createElement('strong');
        strongEl.textContent = labelText + ': ';
        el.parentNode.replaceChild(strongEl, el);
        return;
      } else {
        el.parentNode.removeChild(el);
        return;
      }
    }
    else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      const type = el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : 'text';

      if (type === 'checkbox' || type === 'radio') {
        const isChecked = el.checked || el.hasAttribute('checked');
        replacementText = isChecked ? '[x]' : '[ ]';
      } else if (type === 'password') {
        replacementText = '[ •••••• ]';
      } else {
        let val = el.value || el.getAttribute('value') || '';
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
            optionsList = Array.from(el.options || []).map(opt => opt.text.trim());
          } else {
            const comboId = el.id || '';
            let pickerEl = null;
            if (comboId && originalDoc) {
              const pickerId = comboId.replace('-inputEl', '').replace('-input', '') + '-picker';
              pickerEl = originalDoc.getElementById(pickerId) || originalDoc.querySelector(`[id*="${comboId.replace('-inputEl', '').replace('-input', '')}"]`);
            }
            if (!pickerEl && el.getAttribute('aria-owns') && originalDoc) {
              pickerEl = originalDoc.getElementById(el.getAttribute('aria-owns'));
            }
            if (pickerEl) {
              const items = pickerEl.querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"], li');
              optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
            }
            if (optionsList.length === 0 && originalDoc) {
              const activeLists = originalDoc.querySelectorAll('.x-boundlist:not([style*="display: none"]), .x-combo-list:not([style*="display: none"])');
              if (activeLists.length === 1) {
                const items = activeLists[0].querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"]');
                optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
              }
            }
          }

          if (optionsList.length > 0) {
            replacementText = `[ ${selectedText || ' '} ▾ ] (${optionsList.join(' | ')})`;
          } else {
            replacementText = `[ ${selectedText || ' '} ▾ ]`;
          }
        } else {
          replacementText = `[ ${val || '    '} ]`;
        }
      }
    }

    if (replacementText) {
      const spanEl = doc.createElement('span');
      spanEl.textContent = replacementText;
      el.parentNode.replaceChild(spanEl, el);
    }
  });
}

/**
 * Full preprocessing pipeline to apply to DOM tree before Readability/Turndown conversion
 */
Web2MD.preProcessDOMForConversion = function (clonedNode, originalDoc) {
  try {
    syncFormValues(originalDoc, clonedNode);
  } catch (e) {
    console.error("syncFormValues failed:", e);
  }
  try {
    // Step 1: Identify and mark layout tables bottom-up
    const tables = Array.from(clonedNode.querySelectorAll('table'));
    tables.reverse().forEach(table => {
      if (Web2MD.isLayoutTable(table)) {
        table.setAttribute('data-web2md-layout-table', 'true');
      }
    });
  } catch (e) {
    console.error("Marking layout tables failed:", e);
  }
  try {
    // Step 2: Process form controls globally in-place
    preProcessFormControls(clonedNode, originalDoc);
  } catch (e) {
    console.error("preProcessFormControls failed:", e);
  }
  try {
    // Step 3: Flatten layout tables
    preProcessLayoutTables(clonedNode);
  } catch (e) {
    console.error("preProcessLayoutTables failed:", e);
  }
};

/**
 * Helper to check if a table is used for form layout rather than displaying data
 */
Web2MD.isLayoutTable = function (table) {
  // If it has th headers, it's a data table
  if (table.querySelector('th') !== null) {
    return false;
  }

  // Check for common data-grid or data-table class names or attributes on the table itself
  const classStr = (table.getAttribute('class') || '').toLowerCase();
  const idStr = (table.id || '').toLowerCase();
  const gridClasses = [
    'x-grid-table', 'x-grid-view', 'x-grid-body', 'x-grid-row', 'x-grid-header-ct', 'x-grid-inner',
    'x-data-grid', 'data-grid', 'data-table', 'grid-table', 'gridview', 'datagrid'
  ];
  if (gridClasses.some(cls => classStr.includes(cls) || idStr.includes(cls))) {
    return false;
  }

  // If it contains any child elements that have grid-related classes, it's probably a data table wrapper
  if (table.querySelector('[class*="x-grid-table"], [class*="x-grid-view"], [class*="x-grid-row"], [class*="data-grid"], [class*="grid-table"]')) {
    return false;
  }

  // If it contains nested tables that are NOT layout tables
  const nestedTables = Array.from(table.querySelectorAll('table')).filter(t => t !== table);
  const hasNestedDataTables = nestedTables.some(t => t.getAttribute('data-web2md-layout-table') !== 'true');
  if (hasNestedDataTables) {
    return false;
  }

  // Row/column structure:
  // Data grids usually have many columns, or columns that contain data.
  // Layout tables usually have a simple key-value structure, with at most 3 columns (e.g., Label, Field, Help/Error).
  const directRows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table);
  if (directRows.length > 0) {
    let hasMoreThanThreeCols = false;
    for (const row of directRows) {
      const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
      if (cols.length > 3) {
        hasMoreThanThreeCols = true;
        break;
      }
    }
    if (hasMoreThanThreeCols) {
      return false; // More than 3 columns in a row suggests a data grid, not a layout table
    }

    // Tighten conditions for tables with more than 3 rows to avoid falsely flattening data tables/matrices
    if (directRows.length > 3) {
      // Check for label presence (form layouts usually have labels/form-item-labels in most rows)
      let labelCount = 0;
      directRows.forEach(row => {
        if (row.querySelector('label, .x-form-item-label, .x-form-cb-label, strong')) {
          labelCount++;
        }
      });
      // If less than half of the rows have labels, it's likely a data grid/matrix
      if (labelCount < directRows.length / 2) {
        return false;
      }

      // Check for repetitive checkbox/radio/input matrix structures
      let firstRowColCount = -1;
      let sameColCount = true;
      let inputRowCount = 0;

      for (const row of directRows) {
        const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
        if (cols.length > 0) {
          if (firstRowColCount === -1) {
            firstRowColCount = cols.length;
          } else if (cols.length !== firstRowColCount) {
            sameColCount = false;
          }
          if (row.querySelector('input, select, textarea')) {
            inputRowCount++;
          }
        }
      }

      // If all rows have the same column count (>1) and almost all rows contain inputs (like a checkbox matrix),
      // it is a data table, not a layout table.
      if (sameColCount && firstRowColCount > 1 && inputRowCount > directRows.length * 0.7) {
        return false;
      }
    }
  }

  // A layout table should contain form elements (labels, fields, buttons)
  const inputs = table.querySelectorAll('input, select, textarea, button, .x-btn, .x-form-item-label, label');
  if (inputs.length === 0) {
    return false;
  }

  // Default fallback: if it has inputs, no headers, <= 3 columns, and doesn't look like a grid, it's a layout table.
  return true;
};

/**
 * Preprocesses form layout tables at DOM level into paragraphs with alignment
 */
function preProcessLayoutTables(rootNode) {
  const tables = Array.from(rootNode.querySelectorAll('table[data-web2md-layout-table="true"]'));
  const doc = rootNode.ownerDocument || rootNode;

  // Process bottom-up to handle nested tables
  tables.reverse().forEach(table => {
    const directRows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table);

    let maxCol0Len = 0;
    const rowInfo = [];

    directRows.forEach(row => {
      const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);

      // Filter active columns that have content or form controls
      const activeCols = cols.filter(col => {
        let parent = col;
        let isHidden = false;
        while (parent && parent !== table) {
          const styleAttr = parent.getAttribute && parent.getAttribute('style') || '';
          if (styleAttr.includes('display: none') || styleAttr.includes('display:none') ||
              styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
            isHidden = true;
            break;
          }
          parent = parent.parentNode;
        }
        if (isHidden) return false;
        return col.textContent.trim().length > 0 || col.querySelector('input, select, textarea, button, img, a, span, strong, del, s, strike') !== null;
      });

      if (activeCols.length > 0) {
        rowInfo.push({ row, cols: activeCols });
        if (activeCols.length > 1) {
          const len = activeCols[0].textContent.trim().length;
          if (len > maxCol0Len) {
            maxCol0Len = len;
          }
        }
      }
    });

    const replacementPara = doc.createElement('p');
    replacementPara.className = 'web2md-processed-form-layout';

    let addedRow = false;
    rowInfo.forEach(({ row, cols }) => {
      if (addedRow) {
        replacementPara.appendChild(doc.createElement('br'));
      }

      cols.forEach((col, colIdx) => {
        if (colIdx > 0) {
          // Separator between columns
          replacementPara.appendChild(doc.createTextNode('  '));
        }

        // If it is the first column and there are other columns, pad it
        if (colIdx === 0 && cols.length > 1) {
          const textLen = col.textContent.trim().length;
          const paddingLen = maxCol0Len - textLen;

          while (col.firstChild) {
            replacementPara.appendChild(col.firstChild);
          }
          if (paddingLen > 0) {
            replacementPara.appendChild(doc.createTextNode(' '.repeat(paddingLen)));
          }
        } else {
          // Just move all children
          while (col.firstChild) {
            replacementPara.appendChild(col.firstChild);
          }
        }
      });

      addedRow = true;
    });

    if (addedRow) {
      table.parentNode.replaceChild(replacementPara, table);
    } else {
      // If table is completely empty/hidden, just remove it
      table.parentNode.removeChild(table);
    }
  });
}
