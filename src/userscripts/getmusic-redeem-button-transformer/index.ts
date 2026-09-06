export {};

function transformRedeemButtons(): void {
    const redeemButtonParentElements =
        document.querySelectorAll<HTMLElement>("div[data-hello-url]");
    redeemButtonParentElements.forEach(redeemButtonParent => {
        const url = redeemButtonParent.dataset["helloUrl"];
        const redeemButton = redeemButtonParent.querySelector<HTMLButtonElement>("button");
        if (!redeemButton || !url) return;

        const className = redeemButton.className;
        const redeemButtonChildren = [...redeemButton.children];
        redeemButton.remove();

        const link = document.createElement("a");
        link.href = url;
        link.className = className;
        link.target = "_blank";
        link.rel = "noopener";
        redeemButtonChildren.forEach(child => {
            link.appendChild(child);
        });
        redeemButtonParent.appendChild(link);
    });
}

function maybeBypassVoucherRedirect(): void {
    if (!location.pathname.startsWith("/vouchers/")) return;

    const directLink = document.querySelector<HTMLAnchorElement>(
        "a[href*='bandcamp.com/yum?code=']"
    );
    if (directLink?.href) {
        location.replace(directLink.href);
        return;
    }

    const refreshMeta = document.querySelector<HTMLMetaElement>("meta[http-equiv='refresh']");
    if (!refreshMeta) return;
    const content = refreshMeta.content;
    const match = content.match(/url\s*=\s*(.+)$/i);
    const targetUrl = match?.[1]?.trim();
    if (targetUrl) location.replace(targetUrl);
}

let observer: MutationObserver | undefined;
let observingRoot: Node | undefined;
let scheduled = false;

function ensureObserver(): void {
    const root = document.body ?? document.documentElement;
    if (observer && observingRoot === root) return;
    observer?.disconnect();
    observingRoot = root;
    observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            transformRedeemButtons();
        });
    });
    observer.observe(root, { childList: true, subtree: true });
}

function startObserving(): void {
    ensureObserver();
    transformRedeemButtons();
    maybeBypassVoucherRedirect();
}

function hookSpaNavigation(): void {
    const handleNav = (): void => {
        requestAnimationFrame(() => {
            startObserving();
        });
    };

    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>): void => {
        originalPushState(...args);
        handleNav();
    };

    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = (...args: Parameters<History["replaceState"]>): void => {
        originalReplaceState(...args);
        handleNav();
    };

    window.addEventListener("popstate", handleNav);
    window.addEventListener("pageshow", event => {
        if (event.persisted) startObserving();
    });
    document.addEventListener("turbo:load", startObserving);
    document.addEventListener("turbo:render", startObserving);
    document.addEventListener("turbo:frame-load", startObserving);
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            startObserving();
            hookSpaNavigation();
        },
        { once: true }
    );
} else {
    startObserving();
    hookSpaNavigation();
}
