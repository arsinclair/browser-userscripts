// ==UserScript==
// @name         Bandcamp Restyler Color Sync
// @description  Syncs Bandcamp Restyler CSS variables with the active page text/background colors.
// @version      1.0.1
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @match        https://bandcamp.com/*
// @match        https://*.bandcamp.com/*
// @run-at       document-idle
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/bandcamp-restyler-color-sync.user.js
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/bandcamp-restyler-color-sync.user.js
// ==/UserScript==

(() => {
    const ROOT = document.documentElement;
    const VAR_TEXT = "--bc-restyler-text-color";
    const VAR_BORDER = "--bc-restyler-border-color";
    const VAR_GRADIENT_START = "--bc-restyler-gradient-start";
    const VAR_GRADIENT_END = "--bc-restyler-gradient-end";
    const VAR_BG = "--bc-restyler-page-bg";

    const normalizeHex = (value) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed.startsWith("#")) return null;
        const hex = trimmed.slice(1);
        if (hex.length === 3) {
            return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
        }
        if (hex.length === 6 || hex.length === 8) {
            return `#${hex}`;
        }
        return null;
    };

    const withAlpha = (hex, alphaHex) => {
        const base = normalizeHex(hex);
        if (!base || base.length !== 7) return null;
        return `${base}${alphaHex}`;
    };

    const extractPgBdColors = () => {
        const styleTag = document.querySelector("#custom-design-rules-style");
        if (!styleTag || !styleTag.textContent) return null;
        const match = styleTag.textContent.match(/#pgBd\s*\{[\s\S]*?\}/i);
        if (!match) return null;
        const block = match[0];
        const colorMatch = block.match(/color\s*:\s*(#[0-9a-f]{3,8})/i);
        const bgMatch = block.match(/background\s*:\s*(#[0-9a-f]{3,8})/i);
        return {
            text: colorMatch ? normalizeHex(colorMatch[1]) : null,
            bg: bgMatch ? normalizeHex(bgMatch[1]) : null,
        };
    };

    const applyFromPgBd = (pgBd) => {
        if (!pgBd) return false;
        const extracted = extractPgBdColors();
        const text = extracted ? extracted.text : null;
        const bg = extracted ? extracted.bg : null;

        if (text) {
            ROOT.style.setProperty(VAR_TEXT, text);
            ROOT.style.setProperty(VAR_BORDER, text);
            const start = withAlpha(text, "0d");
            const end = withAlpha(text, "08");
            if (start) ROOT.style.setProperty(VAR_GRADIENT_START, start);
            if (end) ROOT.style.setProperty(VAR_GRADIENT_END, end);
        }

        if (bg) {
            ROOT.style.setProperty(VAR_BG, bg);
        }

        return Boolean(text || bg);
    };

    const attachObserver = (pgBd) => {
        const observer = new MutationObserver(() => {
            applyFromPgBd(pgBd);
        });
        observer.observe(pgBd, { attributes: true, attributeFilter: ["style", "class"] });
    };

    const init = () => {
        const pgBd = document.querySelector("#pgBd");
        if (!pgBd) return false;
        applyFromPgBd(pgBd);
        attachObserver(pgBd);
        return true;
    };

    const boot = () => {
        if (init()) return;
        const observer = new MutationObserver(() => {
            if (init()) observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
