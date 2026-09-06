// ==UserScript==
// @name         getmusic.fm Auto-redeemer
// @description  Opens getmusic.fm redemption links directly in Bandcamp and bypasses voucher redirects.
// @version      2026.09.06.3
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/getmusic-redeem-button-transformer.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/getmusic-redeem-button-transformer.user.js
// @match        *://getmusic.fm/*
// @grant        none
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    function transformRedeemButtons() {
      const redeemButtonParentElements = document.querySelectorAll("div[data-hello-url]");
      redeemButtonParentElements.forEach(redeemButtonParent => {
        const url = redeemButtonParent.dataset["helloUrl"];
        const redeemButton = redeemButtonParent.querySelector("button");
        if (!redeemButton || !url) return;
        const className = redeemButton.className;
        const redeemButtonChildren = [...redeemButton.children];
        redeemButton.remove();
        const link = document.createElement("a");
        link.href = url;
        link.className = className;
        link.target = "_blank";
        link.rel = "noopener";
        redeemButtonChildren.forEach(child => {
          link.appendChild(child);
        });
        redeemButtonParent.appendChild(link);
      });
    }
    function maybeBypassVoucherRedirect() {
      if (!location.pathname.startsWith("/vouchers/")) return;
      const directLink = document.querySelector("a[href*='bandcamp.com/yum?code=']");
      if (directLink?.href) {
        location.replace(directLink.href);
        return;
      }
      const refreshMeta = document.querySelector("meta[http-equiv='refresh']");
      if (!refreshMeta) return;
      const content = refreshMeta.content;
      const match = content.match(/url\s*=\s*(.+)$/i);
      const targetUrl = match?.[1]?.trim();
      if (targetUrl) location.replace(targetUrl);
    }
    let observer;
    let observingRoot;
    let scheduled = false;
    function ensureObserver() {
      const root = document.body ?? document.documentElement;
      if (observer && observingRoot === root) return;
      observer?.disconnect();
      observingRoot = root;

      // Watch dynamic redemption controls and coalesce full-page scans into animation frames.
      observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          transformRedeemButtons();
        });
      });
      observer.observe(root, {
        childList: true,
        subtree: true
      });
    }
    function startObserving() {
      ensureObserver();
      transformRedeemButtons();
      maybeBypassVoucherRedirect();
    }
    function hookSpaNavigation() {
      const handleNav = () => {
        requestAnimationFrame(() => {
          startObserving();
        });
      };
      const originalPushState = history.pushState.bind(history);
      history.pushState = (...args) => {
        originalPushState(...args);
        handleNav();
      };
      const originalReplaceState = history.replaceState.bind(history);
      history.replaceState = (...args) => {
        originalReplaceState(...args);
        handleNav();
      };
      window.addEventListener("popstate", handleNav);
      window.addEventListener("pageshow", event => {
        if (event.persisted) startObserving();
      });
      document.addEventListener("turbo:load", startObserving);
      document.addEventListener("turbo:render", startObserving);
      document.addEventListener("turbo:frame-load", startObserving);
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        startObserving();
        hookSpaNavigation();
      }, {
        once: true
      });
    } else {
      startObserving();
      hookSpaNavigation();
    }

})();
