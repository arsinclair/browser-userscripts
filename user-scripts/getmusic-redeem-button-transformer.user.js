// ==UserScript==
// @name        getmusic.fm Auto-redeemer
// @namespace   https://github.com/arsinclair/browser-userscripts
// @match       *://getmusic.fm/*
// @run-at      document-start
// @grant       none
// @version     1.0.5
// @author      Raman Sinclair
// @description 17/11/2024, 20:36:51
// @updateURL   https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/getmusic-redeem-button-transformer.user.js
// @downloadURL https://github.com/arsinclair/browser-userscripts/raw/master/user-scripts/getmusic-redeem-button-transformer.user.js
// ==/UserScript==

const transformRedeemButtons = () => {
    const redeemButtonParentElements = document.querySelectorAll("div[data-hello-url]");
    redeemButtonParentElements.forEach((redeemButtonParent) => {
        const url = redeemButtonParent.getAttribute("data-hello-url");
        const redeemButton = redeemButtonParent.querySelector("button");
        if (!redeemButton || !url) return;

        const className = redeemButton.className;
        const redeemButtonChildren = Array.from(redeemButton.children);
        redeemButtonParent.removeChild(redeemButton);

        const a = document.createElement("a");
        a.href = url;
        a.className = className;
        a.target = "_blank";
        a.rel = "noopener";
        redeemButtonChildren.forEach((child) => {
            a.appendChild(child);
        });
        redeemButtonParent.appendChild(a);
    });
};

const maybeBypassVoucherRedirect = () => {
    if (!location.pathname.startsWith("/vouchers/")) return;

    const directLink = document.querySelector("a[href*='bandcamp.com/yum?code=']");
    if (directLink && directLink.href) {
        location.replace(directLink.href);
        return;
    }

    const refreshMeta = document.querySelector("meta[http-equiv='refresh']");
    if (!refreshMeta) return;
    const content = refreshMeta.getAttribute("content") || "";
    const match = content.match(/url\s*=\s*(.+)$/i);
    if (!match) return;
    const targetUrl = match[1].trim();
    if (targetUrl) location.replace(targetUrl);
};

let observer;
let observingRoot;
let scheduled = false;

const ensureObserver = () => {
    const root = document.body || document.documentElement;
    if (!root) return;
    if (observer && observingRoot === root) return;
    if (observer) observer.disconnect();
    observingRoot = root;
    observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            transformRedeemButtons();
        });
    });
    observer.observe(root, { childList: true, subtree: true });
};

const startObserving = () => {
    ensureObserver();
    transformRedeemButtons();
    maybeBypassVoucherRedirect();
};

const hookSpaNavigation = () => {
    const handleNav = () => {
        requestAnimationFrame(() => {
            startObserving();
        });
    };

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        const result = originalPushState.apply(this, args);
        handleNav();
        return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        const result = originalReplaceState.apply(this, args);
        handleNav();
        return result;
    };

    window.addEventListener("popstate", handleNav);
    window.addEventListener("pageshow", (e) => {
        if (e.persisted) startObserving();
    });
    document.addEventListener("turbo:load", () => {
        startObserving();
    });
    document.addEventListener("turbo:render", () => {
        startObserving();
    });
    document.addEventListener("turbo:frame-load", () => {
        startObserving();
    });
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        startObserving();
        hookSpaNavigation();
    }, { once: true });
} else {
    startObserving();
    hookSpaNavigation();
}
