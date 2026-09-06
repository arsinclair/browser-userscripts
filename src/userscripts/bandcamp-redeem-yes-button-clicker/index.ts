export {};

function findYesButton(root: ParentNode = document): HTMLButtonElement | null {
    const buttons = root.querySelectorAll<HTMLButtonElement>("button");
    for (const button of buttons) {
        if (button.textContent?.trim() === "Yes") {
            return button;
        }
    }
    return null;
}

function clickRedeemButton(observer?: MutationObserver): void {
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
