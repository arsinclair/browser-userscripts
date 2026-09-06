// ==UserScript==
// @name         Bandcamp Redeem Yes Button Clicker
// @description  Automatically confirms Bandcamp redemption prompts by clicking “Yes”.
// @version      2026.09.06.3
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/bandcamp-redeem-yes-button-clicker.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/bandcamp-redeem-yes-button-clicker.user.js
// @match        https://bandcamp.com/add_to_collection*
// @grant        none
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
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
      // Wait for the asynchronous prompt and disconnect after the one required click.
      const observer = new MutationObserver(() => clickRedeemButton(observer));
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      clickRedeemButton(observer);
    });

})();
