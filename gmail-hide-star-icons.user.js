// ==UserScript==
// @name         Gmail: Hide Star Icons
// @description  Removes the star column from email rows in Gmail mailboxes.
// @version      2026.09.26.1
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

    const STAR_BUTTON_SELECTOR = ['span[role="button"][aria-label="Starred"]', 'span[role="button"][aria-label="Not starred"]'].join(", ");
    function removeStarCells(root) {
      const starButtons = root.querySelectorAll(STAR_BUTTON_SELECTOR);
      if (root instanceof HTMLElement && root.matches(STAR_BUTTON_SELECTOR)) {
        removeStarCell(root);
      }
      starButtons.forEach(removeStarCell);
    }
    function removeStarCell(starButton) {
      const cell = starButton.parentElement;
      if (cell instanceof HTMLTableCellElement && cell.tagName === "TD") {
        cell.remove();
      }
    }
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) {
            removeStarCells(node);
          }
        }
      }
    });
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    removeStarCells(document);

})();
