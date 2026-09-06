// ==UserScript==
// @name         Phonocake Arrow Navigation
// @description  Navigate Phonocake with the left and right keyboard arrows.
// @version      2026.09.06.1
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/phonocake-arrow-navigation.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/phonocake-arrow-navigation.user.js
// @match        https://www.phonocake.org/*
// @grant        none
// @run-at       document-idle
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    const NAVIGATION_SELECTORS = {
      ArrowLeft: "a.arrowprev[href]",
      ArrowRight: "a.arrownext[href]"
    };
    function isTypingTarget(target) {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target instanceof HTMLElement && target.isContentEditable;
    }
    document.addEventListener("keydown", event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTypingTarget(event.target)) {
        return;
      }
      const selector = NAVIGATION_SELECTORS[event.key];
      if (!selector) return;
      const link = document.querySelector(selector);
      if (!link) return;
      event.preventDefault();
      location.assign(link.href);
    });

})();
