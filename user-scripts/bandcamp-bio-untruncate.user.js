// ==UserScript==
// @name         Bandcamp Bio Untruncate
// @description  Expands artist bios by removing Bandcamp's truncation controls.
// @version      1.0.0
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://bandcamp.com/
// @match        https://bandcamp.com/*
// @match        https://*.bandcamp.com/*
// @run-at       document-idle
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

        const moreLinks = bio.querySelectorAll(".peekaboo-link, .peekaboo-text + span > a");
        moreLinks.forEach((node) => {
            const container = node.closest(".peekaboo-link") || node;
            container.remove();
        });
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
