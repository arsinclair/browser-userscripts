// ==UserScript==
// @name        getmusic.fm Auto-redeemer
// @namespace   https://github.com/arsinclair/browser-userscripts
// @match       *://getmusic.fm/*
// @run-at      document-start
// @grant       none
// @version     1.0.2
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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", transformRedeemButtons, { once: true });
} else {
    transformRedeemButtons();
}
