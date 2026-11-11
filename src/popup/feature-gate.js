// plan-exempt — PageSnap branding update
/**
 * PageSnap popup feature gating: hides/shows UI marked with data-feature="<flagName>"
 * and renders the Features toggle list inside the settings panel.
 */
import { getFlags, setFlag } from '../shared/feature-flags.js';

const FEATURE_LABELS = {
  regionSelect: 'Region selection',
  htmlClone: 'HTML Snapshot & ZIP'
};

/**
 * Hides/shows every element with a data-feature attribute based on the current flags.
 */
export function applyFeatureGates(flags) {
  document.querySelectorAll('[data-feature]').forEach((el) => {
    const name = el.getAttribute('data-feature');
    el.style.display = flags[name] ? '' : 'none';
  });
}

/**
 * Renders one toggle row per feature flag into #features-section.
 */
export function renderFeatureToggles(flags) {
  const container = document.getElementById('features-section');
  if (!container) return;

  container.innerHTML = '';

  Object.keys(FEATURE_LABELS).forEach((name) => {
    const row = document.createElement('div');
    row.className = 'setting-group feature-toggle-row';

    const label = document.createElement('label');
    label.className = 'toggle-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `feature-toggle-${name}`;
    input.checked = !!flags[name];

    const slider = document.createElement('span');
    slider.className = 'slider';

    const labelText = document.createElement('span');
    labelText.className = 'label-text';
    labelText.textContent = FEATURE_LABELS[name];

    label.appendChild(input);
    label.appendChild(slider);
    label.appendChild(labelText);
    row.appendChild(label);

    input.addEventListener('change', async () => {
      const newFlags = await setFlag(name, input.checked);
      applyFeatureGates(newFlags);
    });

    container.appendChild(row);
  });
}

/**
 * Loads flags, applies gating, and renders the Features toggle list.
 */
export async function initFeatureGates() {
  const flags = await getFlags();
  applyFeatureGates(flags);
  renderFeatureToggles(flags);
  return flags;
}
