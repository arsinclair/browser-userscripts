// ==UserScript==
// @name         Gmail: Hide Star Icons
// @description  Replaces Gmail's star icons with favicons from each sender's domain.
// @version      2026.09.26.5
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/gmail-hide-star-icons.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/gmail-hide-star-icons.user.js
// @match        https://mail.google.com/mail/*
// @grant        none
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    const STAR_BUTTON_SELECTOR = ['span[role="button"][aria-label="Starred"]', 'span[role="button"][aria-label="Not starred"]', 'span[role="button"][aria-label^="Starred with "]'].join(", ");
    const SENDER_SELECTOR = "span[email]";
    const CACHE_KEY = "gmail-hide-star-icons:favicons:v3";
    const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
    const FAVICON_SERVICE_URL = "https://www.google.com/s2/favicons";
    const faviconCache = readFaviconCache();
    function readFaviconCache() {
      try {
        const value = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return {};
        }
        const now = Date.now();
        return Object.fromEntries(Object.entries(value).filter(entry => {
          const cached = entry[1];
          return typeof cached === "object" && cached !== null && "expiresAt" in cached && typeof cached.expiresAt === "number" && cached.expiresAt > now && "url" in cached && typeof cached.url === "string";
        }));
      } catch {
        return {};
      }
    }
    function cacheFavicon(domain, url) {
      faviconCache[domain] = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        url
      };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(faviconCache));
      } catch {
        // Gmail still gets favicons for this session if storage is unavailable or full.
      }
    }
    function getSenderDomain(row) {
      const email = row.querySelector(SENDER_SELECTOR)?.getAttribute("email")?.trim();
      const atIndex = email?.lastIndexOf("@") ?? -1;
      if (!email || atIndex < 0) {
        return null;
      }
      const domain = email.slice(atIndex + 1).toLowerCase().replace(/\.$/, "");
      const labels = domain.split(".");
      const isValid = labels.every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));
      return isValid ? domain : null;
    }
    function getFaviconUrl(domain) {
      const cached = faviconCache[domain];
      if (cached && cached.expiresAt > Date.now()) {
        return cached.url;
      }
      const url = new URL(FAVICON_SERVICE_URL);
      url.searchParams.set("sz", "64");
      url.searchParams.set("domain", domain);
      cacheFavicon(domain, url.href);
      return url.href;
    }
    function replaceStarIcons(root) {
      const starButtons = root.querySelectorAll(STAR_BUTTON_SELECTOR);
      if (root instanceof HTMLElement && root.matches(STAR_BUTTON_SELECTOR)) {
        replaceStarIcon(root);
      }
      starButtons.forEach(replaceStarIcon);
    }
    function replaceStarIcon(starButton) {
      const cell = starButton.closest("td");
      const row = starButton.closest("tr");
      if (!(cell instanceof HTMLTableCellElement) || !(row instanceof HTMLTableRowElement)) {
        return;
      }
      const domain = getSenderDomain(row);
      cell.replaceChildren();
      if (!domain) {
        return;
      }
      const image = document.createElement("img");
      image.src = getFaviconUrl(domain);
      image.alt = "";
      image.title = domain;
      image.width = 16;
      image.height = 16;
      image.referrerPolicy = "no-referrer";
      image.decoding = "async";
      image.style.display = "block";
      image.style.margin = "auto";
      cell.replaceChildren(image);
    }
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) {
            replaceStarIcons(node);
          }
        }
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    replaceStarIcons(document);

})();
