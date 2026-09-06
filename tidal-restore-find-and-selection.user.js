// ==UserScript==
// @name         Tidal: Restore Ctrl+F + Selection + Disable Drag
// @description  Prevents Tidal from hijacking Ctrl+F/Cmd+F, re-enables selection, and disables element dragging so text can be selected.
// @version      2026.09.06.1
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/tidal-restore-find-and-selection.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/tidal-restore-find-and-selection.user.js
// @match        https://tidal.com/album/*/credits*
// @grant        none
// @run-at       document-start
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    // -----------------------------
    // 1) Restore native Ctrl+F / Cmd+F
    // -----------------------------
    function isFindShortcut(event) {
      const isF = event.key.toLowerCase() === "f" || event.code === "KeyF";
      const hasModifier = event.ctrlKey || event.metaKey;
      return hasModifier && isF;
    }
    function stopForNativeFind(event) {
      if (!isFindShortcut(event)) return;

      // Do NOT preventDefault() — we want the browser Find UI.
      event.stopImmediatePropagation();
      event.stopPropagation();
      try {
        event.cancelBubble = true;
      } catch {
        // The propagation methods above are sufficient if cancelBubble is read-only.
      }
    }
    window.addEventListener("keydown", stopForNativeFind, {
      capture: true
    });
    window.addEventListener("keypress", stopForNativeFind, {
      capture: true
    });
    window.addEventListener("keyup", stopForNativeFind, {
      capture: true
    });

    // -----------------------------
    // 2) Force user-select + reduce "callout"/drag CSS behaviors
    // -----------------------------
    function injectCSS() {
      const style = document.createElement("style");
      style.id = "tm-tidal-fix-selection-and-drag";
      style.textContent = `
        /* Make text selectable everywhere */
        html, body, * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }

        /* Disable WebKit drag behaviors that create "draggable" feel */
        html, body, * {
            -webkit-user-drag: none !important;
            user-drag: none !important;
        }

        /* Mobile-ish extras (harmless on desktop, helpful on touch) */
        html, body, * {
            -webkit-touch-callout: default !important;
        }
    `;
      if (document.documentElement) {
        document.documentElement.append(style);
        return;
      }
      const observer = new MutationObserver(() => {
        if (!document.documentElement) return;
        observer.disconnect();
        document.documentElement.append(style);
      });
      observer.observe(document, {
        childList: true
      });
    }
    injectCSS();

    // -----------------------------
    // 3) Disable draggability at the DOM + event level
    // -----------------------------

    // a) If elements are explicitly draggable, turn it off.
    function scrubDraggableAttributes(root = document) {
      try {
        // Turn off any explicit draggable=true, including the supplied root.
        if (root instanceof Element && root.getAttribute("draggable") === "true") {
          root.setAttribute("draggable", "false");
        }
        root.querySelectorAll('[draggable="true"]').forEach(element => {
          element.setAttribute("draggable", "false");
        });
      } catch {
        // Keep the remaining fixes active if Tidal replaces an element mid-scan.
      }
    }

    // b) If the app keeps re-adding it, observe and revert.
    function startDraggableObserver() {
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === "attributes" && mutation.attributeName === "draggable") {
            const element = mutation.target;
            if (element instanceof Element && element.getAttribute("draggable") === "true") {
              element.setAttribute("draggable", "false");
            }
          } else if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
              if (node instanceof Element) {
                scrubDraggableAttributes(node);
              }
            }
          }
        }
      });
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["draggable"]
      });

      // Initial pass
      scrubDraggableAttributes();
    }

    // c) Stop drag from starting (this is often the key piece).
    function killDragStart(event) {
      // If you *ever* need native dragging for something, you'd have to scope this.
      event.preventDefault(); // cancel the drag
      event.stopImmediatePropagation(); // block app handlers
      event.stopPropagation();
    }

    // Make sure we install observer after DOM exists enough; also works if called now.
    startDraggableObserver();

    // Capture-phase so we win against framework handlers.
    window.addEventListener("dragstart", killDragStart, {
      capture: true
    });

})();
