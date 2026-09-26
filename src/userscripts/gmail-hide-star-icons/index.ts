const STAR_BUTTON_SELECTOR = [
    'span[role="button"][aria-label="Starred"]',
    'span[role="button"][aria-label="Not starred"]'
].join(", ");

function removeStarCells(root: ParentNode): void {
    const starButtons = root.querySelectorAll<HTMLElement>(STAR_BUTTON_SELECTOR);

    if (root instanceof HTMLElement && root.matches(STAR_BUTTON_SELECTOR)) {
        removeStarCell(root);
    }

    starButtons.forEach(removeStarCell);
}

function removeStarCell(starButton: HTMLElement): void {
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

observer.observe(document, { childList: true, subtree: true });
removeStarCells(document);
