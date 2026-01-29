// ==UserScript==
// @name        Bandcamp Redeem Yes Button Clicker
// @namespace   https://bandcamp.com
// @match       https://bandcamp.com/add_to_collection*
// @grant       none
// @version     1.0.1
// @author      Raman Sinclair
// @description 17/11/2024, 20:36:51
// ==/UserScript==

const findYesButton = (root = document) => {
    const buttons = root.querySelectorAll("button");
    for (const button of buttons) {
        if (button.textContent && button.textContent.trim() === "Yes") {
            return button;
        }
    }
    return null;
};

const clickRedeemButton = (observer) => {
    const redeemButton = findYesButton();
    if (!redeemButton) return;

    redeemButton.click();
    if (observer) observer.disconnect();
};

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // Function to click the button when found
    // Set up a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(() => clickRedeemButton(observer));

    // Observe the entire document for child node additions
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Try clicking immediately in case the button is already loaded
    clickRedeemButton(observer);
});
