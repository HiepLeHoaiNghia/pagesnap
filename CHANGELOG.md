# Changelog

## [1.1.0](https://github.com/HiepLeHoaiNghia/pagesnap/compare/pagesnap-extension-v1.0.0...pagesnap-extension-v1.1.0) (2026-11-03)


### Features

* **motion:** one-click hover sweep and automatic motion measurement for component export ([#18](https://github.com/HiepLeHoaiNghia/pagesnap/issues/18)) ([0322486](https://github.com/HiepLeHoaiNghia/pagesnap/commit/03224861fe82b3ea9908c1198607e29c1a956ab2))
* **release:** nested keyframes, responsive authored css, dark/light auto-frame, and canvas detection ([#23](https://github.com/HiepLeHoaiNghia/pagesnap/issues/23)) ([0f0f532](https://github.com/HiepLeHoaiNghia/pagesnap/commit/0f0f5326f95655ec082560e14a815cfa38b9a0e8))
* **studio:** redesigned dock and Studio, no-JS export, site-independent hover ([#19](https://github.com/HiepLeHoaiNghia/pagesnap/issues/19)) ([1d96a11](https://github.com/HiepLeHoaiNghia/pagesnap/commit/1d96a1197f2bedb3a5cf5dcb8ca0a56eac35df84))

## [1.0.0](https://github.com/HiepLeHoaiNghia/pagesnap/compare/pagesnap-extension-v0.5.0...pagesnap-extension-v1.0.0) (2026-10-26)


### ⚠ BREAKING CHANGES

* **governance:** Removed <all_urls> from host_permissions, enforced Conventional Commit breaking change gate, and migrated legacy region-select actions to unified inspector.

### Features

* **download,snapshot,studio:** fix download naming, restore HTML snapshot styles, and capture JS motion ([#13](https://github.com/HiepLeHoaiNghia/pagesnap/issues/13)) ([11aca29](https://github.com/HiepLeHoaiNghia/pagesnap/commit/11aca297177408661b436dcc4d78f540529b8d32))
* **governance:** implement standard commitlint breaking change gate and resolve review findings ([#12](https://github.com/HiepLeHoaiNghia/pagesnap/issues/12)) ([68b1d3f](https://github.com/HiepLeHoaiNghia/pagesnap/commit/68b1d3f80a1b9c0e01831502bb8c99d86839e773))
* **studio:** add component style extractor, live studio sandbox, modular code exports, and component ZIP ([#11](https://github.com/HiepLeHoaiNghia/pagesnap/issues/11)) ([2eeb96f](https://github.com/HiepLeHoaiNghia/pagesnap/commit/2eeb96f8a42b329d11901d89c232be8741f99d5f))

## [0.5.0](https://github.com/HiepLeHoaiNghia/pagesnap/compare/pagesnap-extension-v0.4.0...pagesnap-extension-v0.5.0) (2026-10-23)


### Features

* **pagesnap:** rebrand to PageSnap, clean snapshots, and adopt release blueprint ([e0e5db8](https://github.com/HiepLeHoaiNghia/pagesnap/commit/e0e5db87001cb11d5001c18e72796cfa7cf8e880))
* **pagesnap:** rebrand to PageSnap, clean snapshots, and adopt release blueprint ([#7](https://github.com/HiepLeHoaiNghia/pagesnap/issues/7)) ([e0e5db8](https://github.com/HiepLeHoaiNghia/pagesnap/commit/e0e5db87001cb11d5001c18e72796cfa7cf8e880))

## [0.4.0](https://github.com/HiepLeHoaiNghia/pagesnap/compare/pagesnap-extension-v0.3.0...pagesnap-extension-v0.4.0) (2026-10-23)


### Features

* add inspect mode with mutual exclusion for visual edit and display mock status indicators in popup ([6b8e50b](https://github.com/HiepLeHoaiNghia/pagesnap/commit/6b8e50b4e730bfe3fdd4d5d3bec64d82870f2747))
* add region selection mode with fallback visible text extraction and JSZip support ([20c355f](https://github.com/HiepLeHoaiNghia/pagesnap/commit/20c355fa8f2a02814ba9a497e04ece33bb2df334))
* implement API call interception and state management with persistent mocking support ([beccf0f](https://github.com/HiepLeHoaiNghia/pagesnap/commit/beccf0f1a92aeba083c1b94e00bf4d2acbe2d4bd))
* implement API request mocking system and React component inspection engine in main world context ([9d65bf4](https://github.com/HiepLeHoaiNghia/pagesnap/commit/9d65bf472096a6c8e13b0749448473a3ddc015f0))
* implement full HTML cloning capability with CSS consolidation, asset base64-inlining, Declarative Shadow DOM support, and sandbox preview UI ([21d99de](https://github.com/HiepLeHoaiNghia/pagesnap/commit/21d99de5e34f1a24b9ad03401493b55ecdea3431))
* implement HTML cloner ZIP package with split CSS/JS/assets and offline mocking support ([36de128](https://github.com/HiepLeHoaiNghia/pagesnap/commit/36de1288b6c71254fc7e64d8845108c6daf73f71))
* implement preserve JS and offline API mocking for page cloning ([8d8bc0a](https://github.com/HiepLeHoaiNghia/pagesnap/commit/8d8bc0aba4511ce92753337008d4074b45e971d2))
* implement shadow DOM traversal, candidates scoring, background caching, and iframe support for VFS extraction ([77d627c](https://github.com/HiepLeHoaiNghia/pagesnap/commit/77d627cfcfcc45dcafc1bbcb5d67d29509d571fd))
* rebrand to PageSnap v0.3.0, eliminate API blocking, add E2E tests and release please pipeline ([#2](https://github.com/HiepLeHoaiNghia/pagesnap/issues/2)) ([b2f3b13](https://github.com/HiepLeHoaiNghia/pagesnap/commit/b2f3b132c5ae510abd6f657e0f7b2f601284896f))
* use chrome.downloads API with saveAs option to force select directory on download ([45c0555](https://github.com/HiepLeHoaiNghia/pagesnap/commit/45c055566da140d2e880113dbd5681874d2de2ad))


### Bug Fixes

* **ext:** resolve styling fidelity, frame detection, and save-as downloads ([d61f4d8](https://github.com/HiepLeHoaiNghia/pagesnap/commit/d61f4d8aa9c9d7f3ba1801ff4a770142cc98c3a0))
* harden feature modules and add regression checks ([1a81a90](https://github.com/HiepLeHoaiNghia/pagesnap/commit/1a81a90c80f9d7814cc22aae0bdd67c6c8cbdb81))
* resolve CSS CORS, recursively parse [@import](https://github.com/import), and fix download directory prompt ([25b60e0](https://github.com/HiepLeHoaiNghia/pagesnap/commit/25b60e02c289c8a3e9744a8ecc7fc08e4dfb3ced))
* target top-level frame for extraction and specific frame for context menus to prevent about:blank iframe leak ([2ab1df2](https://github.com/HiepLeHoaiNghia/pagesnap/commit/2ab1df2f3969763df2dd68d845e475d85172d1fd))


### Performance Improvements

* run content scripts on-demand only, optimize VFS scanning speed, and fix epom.com error undefined ([3ffc1bf](https://github.com/HiepLeHoaiNghia/pagesnap/commit/3ffc1bfc435c22849df8cbfc4a359f36c12f34d0))
