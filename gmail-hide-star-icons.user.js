// ==UserScript==
// @name         Gmail: Hide Star Icons
// @description  Replaces Gmail's star icons with favicons from each sender's domain.
// @version      2026.09.26.3
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/gmail-hide-star-icons.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/gmail-hide-star-icons.user.js
// @match        https://mail.google.com/mail/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    const STAR_BUTTON_SELECTOR = ['span[role="button"][aria-label="Starred"]', 'span[role="button"][aria-label="Not starred"]', 'span[role="button"][aria-label^="Starred with "]'].join(", ");
    const SENDER_SELECTOR = "span[email]";
    const CACHE_KEY = "gmail-hide-star-icons:favicons:v2";
    const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
    const IMAGE_LOAD_TIMEOUT_MS = 8_000;
    const PAGE_LOAD_TIMEOUT_MS = 10_000;
    const FAVICON_PATHS = ["/favicon.ico", "/favicon.png", "/favicon-16x16.png", "/apple-touch-icon.png"];
    const faviconCache = readFaviconCache();
    const faviconPromises = new Map();
    function readFaviconCache() {
      try {
        const value = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return {};
        }
        const now = Date.now();
        return Object.fromEntries(Object.entries(value).filter(entry => {
          const cached = entry[1];
          return typeof cached === "object" && cached !== null && "expiresAt" in cached && typeof cached.expiresAt === "number" && cached.expiresAt > now && "url" in cached && (typeof cached.url === "string" || cached.url === null);
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
    function getDomainCandidates(domain) {
      const labels = domain.split(".");
      const lastCandidateIndex = Math.max(0, labels.length - 2);
      return labels.slice(0, lastCandidateIndex + 1).map((_, index) => labels.slice(index).join("."));
    }
    function canLoadImage(url) {
      return new Promise(resolve => {
        const image = new Image();
        let settled = false;
        const finish = loaded => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          image.onload = null;
          image.onerror = null;
          resolve(loaded);
        };
        const timeout = window.setTimeout(() => finish(false), IMAGE_LOAD_TIMEOUT_MS);
        image.referrerPolicy = "no-referrer";
        image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
        image.onerror = () => finish(false);
        image.src = url;
      });
    }
    function requestPage(url) {
      return new Promise(resolve => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: PAGE_LOAD_TIMEOUT_MS,
          headers: {
            Accept: "text/html,application/xhtml+xml"
          },
          onload: response => {
            if (response.status < 200 || response.status >= 300 || typeof response.responseText !== "string") {
              resolve(null);
              return;
            }
            resolve({
              body: response.responseText,
              finalUrl: response.finalUrl || url
            });
          },
          onabort: () => resolve(null),
          onerror: () => resolve(null),
          ontimeout: () => resolve(null)
        });
      });
    }
    function getDeclaredFaviconUrls(html, pageUrl) {
      const page = new DOMParser().parseFromString(html, "text/html");
      const baseHref = page.querySelector("base[href]")?.getAttribute("href");
      let baseUrl = pageUrl;
      if (baseHref) {
        try {
          baseUrl = new URL(baseHref, pageUrl).href;
        } catch {
          // Ignore an invalid base element and resolve icons against the page URL.
        }
      }
      const links = [...page.querySelectorAll("link[href]")].filter(link => link.rel.toLowerCase().split(/\s+/).some(value => value === "icon" || value.endsWith("-icon"))).sort((left, right) => {
        const is16By16 = link => link.sizes.value.toLowerCase().split(/\s+/).includes("16x16");
        return Number(is16By16(right)) - Number(is16By16(left));
      });
      const urls = new Set();
      for (const link of links) {
        const href = link.getAttribute("href");
        if (!href) {
          continue;
        }
        try {
          const url = new URL(href, baseUrl);
          if (url.protocol === "https:" || url.protocol === "http:") {
            urls.add(url.href);
          }
        } catch {
          // Ignore malformed icon URLs and continue with the remaining declarations.
        }
      }
      return [...urls];
    }
    async function findDeclaredFavicon(domain) {
      const page = await requestPage(`https://${domain}/`);
      if (!page) {
        return null;
      }
      for (const url of getDeclaredFaviconUrls(page.body, page.finalUrl)) {
        if (await canLoadImage(url)) {
          return url;
        }
      }
      return null;
    }
    async function findFaviconForDomain(domain) {
      const cached = faviconCache[domain];
      if (cached && cached.expiresAt > Date.now()) {
        if (cached.url === null || (await canLoadImage(cached.url))) {
          return cached.url;
        }
      }
      for (const path of FAVICON_PATHS) {
        const url = `https://${domain}${path}`;
        if (await canLoadImage(url)) {
          cacheFavicon(domain, url);
          return url;
        }
      }
      const declaredUrl = await findDeclaredFavicon(domain);
      if (declaredUrl) {
        cacheFavicon(domain, declaredUrl);
        return declaredUrl;
      }
      cacheFavicon(domain, null);
      return null;
    }
    function getFaviconForDomain(domain) {
      const pending = faviconPromises.get(domain);
      if (pending) {
        return pending;
      }
      const promise = findFaviconForDomain(domain).finally(() => {
        faviconPromises.delete(domain);
      });
      faviconPromises.set(domain, promise);
      return promise;
    }
    async function resolveFavicon(domain) {
      for (const candidate of getDomainCandidates(domain)) {
        const url = await getFaviconForDomain(candidate);
        if (url) {
          if (candidate !== domain) {
            cacheFavicon(domain, url);
          }
          return url;
        }
      }
      return null;
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
      cell.dataset["senderFaviconDomain"] = domain;
      void resolveFavicon(domain).then(url => {
        if (!url || !cell.isConnected || cell.dataset["senderFaviconDomain"] !== domain || getSenderDomain(row) !== domain) {
          return;
        }
        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.title = domain;
        image.width = 16;
        image.height = 16;
        image.referrerPolicy = "no-referrer";
        image.decoding = "async";
        image.style.display = "block";
        image.style.margin = "auto";
        cell.replaceChildren(image);
      });
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
