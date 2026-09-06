export {};

const NAVIGATION_SELECTORS = {
    ArrowLeft: "a.arrowprev[href]",
    ArrowRight: "a.arrownext[href]"
} as const satisfies Partial<Record<KeyboardEvent["key"], string>>;

function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

document.addEventListener("keydown", event => {
    if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTypingTarget(event.target)
    ) {
        return;
    }

    const selector = NAVIGATION_SELECTORS[event.key as keyof typeof NAVIGATION_SELECTORS];
    if (!selector) return;

    const link = document.querySelector<HTMLAnchorElement>(selector);
    if (!link) return;

    event.preventDefault();
    location.assign(link.href);
});
