/**
 * Web2MD popup VFS project banner + "download all project files" export.
 * Gated behind the projectDetect feature flag via data-feature on #project-banner.
 */
import { downloadFile } from './extract.js';

const projectBanner = document.getElementById('project-banner');
const projectBannerText = document.getElementById('project-banner-text');

/**
 * Consolidates and downloads all project files from VFS as a single Markdown file
 */
export function downloadProjectMarkdown(projectFiles, appTitle) {
  let markdown = `# Project: ${appTitle || 'Applet'}\n\n`;
  markdown += `Extracted on: ${new Date().toISOString().split('T')[0]}\n\n`;
  markdown += `## Project Structure\n\n`;
  projectFiles.forEach(file => {
    markdown += `- \`${file.path}\` (${file.content.length} chars)\n`;
  });
  markdown += `\n---\n\n`;

  projectFiles.forEach(file => {
    const ext = file.path.split('.').pop() || '';
    markdown += `### File: ${file.path}\n\n`;
    markdown += `\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
    markdown += `---\n\n`;
  });

  const sanitizedTitle = (appTitle || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'project';
  const filename = `${sanitizedTitle}-all-files.md`;
  downloadFile(markdown, filename);
}

/**
 * Shows/updates the VFS project banner and wires the "Download Project" button.
 */
export function renderProjectBanner(data) {
  if (!projectBanner) return;

  if (data.projectFiles && data.projectFiles.length > 0) {
    projectBanner.classList.remove('hidden');
    if (projectBannerText) {
      projectBannerText.innerText = `Project Detected (${data.projectFiles.length} files)`;
    }
    const oldBtn = document.getElementById('btn-download-project');
    if (oldBtn) {
      const newBtn = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(newBtn, oldBtn);
      newBtn.addEventListener('click', () => {
        downloadProjectMarkdown(data.projectFiles, data.title);
      });
    }
  } else {
    projectBanner.classList.add('hidden');
  }
}

export function hideProjectBanner() {
  if (projectBanner) projectBanner.classList.add('hidden');
}
