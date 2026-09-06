// ==UserScript==
// @name         DLCM Redeem Button Transformer
// @description  Automatically generates a Bandcamp code on DLCM and opens its redemption link.
// @version      2026.09.06.1
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/dlcm-redeem-button-transformer.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/dlcm-redeem-button-transformer.user.js
// @match        *://dlcm.app/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const GENERATE_BUTTON_TEXT = "Generate Bandcamp Code";
    const REDEEM_LINK_TEXT = "Redeem";
    const activatedElements = new WeakSet();
    let scanScheduled = false;
    function normalizedText(element) {
      return element.textContent?.replace(/\s+/gu, " ").trim() ?? "";
    }
    function findGenerateButton() {
      return [...document.querySelectorAll("button")].find(button => !button.disabled && !activatedElements.has(button) && normalizedText(button) === GENERATE_BUTTON_TEXT);
    }
    function findRedeemLink() {
      return [...document.querySelectorAll("a")].find(link => !activatedElements.has(link) && normalizedText(link).toLowerCase().includes(REDEEM_LINK_TEXT.toLowerCase()));
    }
    function activate(element) {
      activatedElements.add(element);
      element.click();
    }
    function advanceRedemption(observer) {
      const redeemLink = findRedeemLink();
      if (redeemLink) {
        observer.disconnect();
        activate(redeemLink);
        return;
      }
      const generateButton = findGenerateButton();
      if (generateButton) {
        activate(generateButton);
      }
    }
    function scheduleScan(observer) {
      if (scanScheduled) return;
      scanScheduled = true;
      requestAnimationFrame(() => {
        scanScheduled = false;
        advanceRedemption(observer);
      });
    }
    const observer = new MutationObserver(() => scheduleScan(observer));
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    scheduleScan(observer);

})();
