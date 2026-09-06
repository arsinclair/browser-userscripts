export {};

// -----------------------------
// 1) Restore native Ctrl+F / Cmd+F
// -----------------------------
function isFindShortcut(event: KeyboardEvent): boolean {
    const isF = event.key.toLowerCase() === "f" || event.code === "KeyF";
    const hasModifier = event.ctrlKey || event.metaKey;
    return hasModifier && isF;
}

function stopForNativeFind(event: KeyboardEvent): void {
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

window.addEventListener("keydown", stopForNativeFind, { capture: true });
window.addEventListener("keypress", stopForNativeFind, { capture: true });
window.addEventListener("keyup", stopForNativeFind, { capture: true });

// -----------------------------
// 2) Force user-select + reduce "callout"/drag CSS behaviors
// -----------------------------
function injectCSS(): void {
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
    observer.observe(document, { childList: true });
}

injectCSS();

// -----------------------------
// 3) Disable draggability at the DOM + event level
// -----------------------------

// a) If elements are explicitly draggable, turn it off.
function scrubDraggableAttributes(root: Document | Element = document): void {
    try {
        // Turn off any explicit draggable=true, including the supplied root.
        if (root instanceof Element && root.getAttribute("draggable") === "true") {
            root.setAttribute("draggable", "false");
        }

        root.querySelectorAll<HTMLElement>('[draggable="true"]').forEach(element => {
            element.setAttribute("draggable", "false");
        });
    } catch {
        // Keep the remaining fixes active if Tidal replaces an element mid-scan.
    }
}

// b) If the app keeps re-adding it, observe and revert.
function startDraggableObserver(): void {
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
function killDragStart(event: DragEvent): void {
    // If you *ever* need native dragging for something, you'd have to scope this.
    event.preventDefault(); // cancel the drag
    event.stopImmediatePropagation(); // block app handlers
    event.stopPropagation();
}

// Make sure we install observer after DOM exists enough; also works if called now.
startDraggableObserver();

// Capture-phase so we win against framework handlers.
window.addEventListener("dragstart", killDragStart, { capture: true });

// Optional: If Tidal uses pointer/mouse listeners to simulate dragging,
// this can help, but it's more invasive. Only enable if needed.
// It tries to block handlers that prevent selection, without killing clicks.
const ENABLE_SELECTION_BLOCKER_OVERRIDES = false;

function stopSelectionBlockers(event: Event): void {
    event.stopImmediatePropagation();
    event.stopPropagation();
}

// Set ENABLE_SELECTION_BLOCKER_OVERRIDES to true if selection STILL won't start
// (some apps cancel it).
if (ENABLE_SELECTION_BLOCKER_OVERRIDES) {
    window.addEventListener("selectstart", stopSelectionBlockers, { capture: true });
    window.addEventListener("mousedown", stopSelectionBlockers, { capture: true });
    window.addEventListener("pointerdown", stopSelectionBlockers, { capture: true });
}
