export {};

const GENERATE_BUTTON_TEXT = "Generate Bandcamp Code";
const REDEEM_LINK_TEXT = "Redeem";

const activatedElements = new WeakSet<HTMLElement>();
let scanScheduled = false;

function normalizedText(element: HTMLElement): string {
    return element.textContent?.replace(/\s+/gu, " ").trim() ?? "";
}

function findGenerateButton(): HTMLButtonElement | undefined {
    return [...document.querySelectorAll<HTMLButtonElement>("button")].find(
        button =>
            !button.disabled &&
            !activatedElements.has(button) &&
            normalizedText(button) === GENERATE_BUTTON_TEXT
    );
}

function findRedeemLink(): HTMLAnchorElement | undefined {
    return [...document.querySelectorAll<HTMLAnchorElement>("a")].find(
        link =>
            !activatedElements.has(link) &&
            normalizedText(link).toLowerCase().includes(REDEEM_LINK_TEXT.toLowerCase())
    );
}

function activate(element: HTMLElement): void {
    activatedElements.add(element);
    element.click();
}

function advanceRedemption(observer: MutationObserver): void {
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

function scheduleScan(observer: MutationObserver): void {
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
