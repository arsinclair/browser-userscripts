export {};

const DIALOG_SELECTOR = 'div.ui-dialog[role="dialog"]';
const EMAIL_SELECTOR = "#fan_email_address";
const POSTAL_CODE_SELECTOR = "#fan_email_postalcode";
const FILL_DELAY_MS = 100;
const EMAIL_STORAGE_KEY = "email";
const POSTAL_CODE_STORAGE_KEY = "postalCode";

interface AutofillDetails {
    email: string;
    postalCode: string;
}

let setupDismissed = false;

function isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return !element.hidden && style.display !== "none" && style.visibility !== "hidden";
}

function setInputValue(input: HTMLInputElement, value: string): void {
    if (input.value === value) return;

    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getStoredDetails(): AutofillDetails | null {
    const email = GM_getValue(EMAIL_STORAGE_KEY, "").trim();
    const postalCode = GM_getValue(POSTAL_CODE_STORAGE_KEY, "").trim();

    return email && postalCode ? { email, postalCode } : null;
}

function configureAutofill(): AutofillDetails | null {
    const currentDetails = getStoredDetails();
    const email = window.prompt(
        "Enter the email address to use in Bandcamp purchase dialogs:",
        currentDetails?.email ?? ""
    );
    if (email === null) return null;

    const postalCode = window.prompt(
        "Enter the postal code to use in Bandcamp purchase dialogs:",
        currentDetails?.postalCode ?? ""
    );
    if (postalCode === null) return null;

    const details = { email: email.trim(), postalCode: postalCode.trim() };
    if (!details.email || !details.postalCode) {
        window.alert(
            "Both an email address and postal code are required. Settings were not changed."
        );
        return null;
    }

    GM_setValue(EMAIL_STORAGE_KEY, details.email);
    GM_setValue(POSTAL_CODE_STORAGE_KEY, details.postalCode);
    return details;
}

function getAutofillDetails(): AutofillDetails | null {
    const storedDetails = getStoredDetails();
    if (storedDetails || setupDismissed) return storedDetails;

    const configuredDetails = configureAutofill();
    setupDismissed = configuredDetails === null;
    return configuredDetails;
}

function fillPurchaseDialog(): void {
    const dialogs = [...document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)].filter(dialog => {
        if (!isVisible(dialog)) return false;
        return Boolean(dialog.querySelector(`${EMAIL_SELECTOR}, ${POSTAL_CODE_SELECTOR}`));
    });
    if (dialogs.length === 0) return;

    const details = getAutofillDetails();
    if (!details) return;

    for (const dialog of dialogs) {
        const emailInput = dialog.querySelector<HTMLInputElement>(EMAIL_SELECTOR);
        const postalCodeInput = dialog.querySelector<HTMLInputElement>(POSTAL_CODE_SELECTOR);

        if (emailInput) setInputValue(emailInput, details.email);
        if (postalCodeInput) setInputValue(postalCodeInput, details.postalCode);
    }
}

let pendingFill: number | undefined;

function scheduleFill(): void {
    if (pendingFill !== undefined) return;

    pendingFill = window.setTimeout(() => {
        pendingFill = undefined;
        fillPurchaseDialog();
    }, FILL_DELAY_MS);
}

GM_registerMenuCommand("Edit Bandcamp autofill details", () => {
    const details = configureAutofill();
    if (!details) return;

    setupDismissed = false;
    fillPurchaseDialog();
});

// Bandcamp may create the purchase dialog lazily or reuse it after hiding it.
const observer = new MutationObserver(scheduleFill);
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "style"]
});

scheduleFill();
