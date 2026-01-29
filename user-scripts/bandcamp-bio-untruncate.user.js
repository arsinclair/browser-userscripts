// ==UserScript==
// @name         Bandcamp Bio Untruncate
// @description  Expands artist bios by removing Bandcamp's truncation controls.
// @version      1.0.3
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @match        https://bandcamp.com/*
// @match        https://*.bandcamp.com/*
// @run-at       document-idle
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/bandcamp-bio-untruncate.user.js
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/bandcamp-bio-untruncate.user.js
// ==/UserScript==

(() => {
    const expandBio = (root = document) => {
        const bio = root.querySelector("#bio-text");
        if (!bio) return;

        const moreBlocks = bio.querySelectorAll(".bcTruncateMore");
        moreBlocks.forEach((node) => {
            node.style.display = "";
            node.removeAttribute("style");
        });

        const ellipses = bio.querySelectorAll(".bcTruncateEllipsis, .peekaboo-ellipsis");
        ellipses.forEach((node) => node.remove());

        const linkSpans = bio.querySelectorAll("span > a");
        linkSpans.forEach((link) => {
            const text = link.textContent ? link.textContent.trim().toLowerCase() : "";
            if (text === "more" || text === "less") {
                const container = link.closest("span") || link;
                container.remove();
            }
        });

        const peekabooLinks = bio.querySelectorAll(".peekaboo-link");
        peekabooLinks.forEach((node) => node.remove());
    };

    expandBio();

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.querySelector && node.querySelector("#bio-text")) {
                    expandBio(node);
                }
            }
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
})();
