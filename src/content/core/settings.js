// plan-exempt — PageSnap branding update
/**
 * PageSnap content settings loader (reads from chrome.storage.sync).
 */

/**
 * Helper to fetch settings from chrome.storage
 */
PageSnap.getSettings = Web2MD.getSettings = function () {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      const defaults = {
        frontmatter: false,
        rawMode: false,
        includeImages: true,
        includeLinks: true,
// plan-exempt — add downloadSubfolder to content settings defaults
// plan-exempt — clean defaults without dead subfolder
        obsidianMode: false,
        headingStyle: 'atx',
        bulletStyle: '-',
        codeBlockStyle: 'fenced'
      };
      resolve(data.settings ? { ...defaults, ...data.settings } : defaults);
    });
  });
};
