// ==UserScript==
// @name         Bandcamp Redeem Yes Button Clicker
// @description  Automatically clicks the “Yes” button on Bandcamp’s redeem page to save you a click.
// @version      1.0.4
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/bandcamp-redeem-yes-button-clicker.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/bandcamp-redeem-yes-button-clicker.user.js
// @match        https://bandcamp.com/add_to_collection*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    function findYesButton(root = document) {
      const buttons = root.querySelectorAll("button");
      for (const button of buttons) {
        if (button.textContent?.trim() === "Yes") {
          return button;
        }
      }
      return null;
    }
    function clickRedeemButton(observer) {
      const redeemButton = findYesButton();
      if (!redeemButton) return;
      redeemButton.click();
      observer?.disconnect();
    }
    document.addEventListener("DOMContentLoaded", () => {
      const observer = new MutationObserver(() => clickRedeemButton(observer));
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      clickRedeemButton(observer);
    });

})();
