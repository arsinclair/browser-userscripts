export {};

const expandBio = (root: ParentNode = document): void => {
    const bio = root.querySelector<HTMLElement>("#bio-text");
    if (!bio) return;

    const moreBlocks = bio.querySelectorAll<HTMLElement>(".bcTruncateMore");
    moreBlocks.forEach(node => {
        node.style.display = "";
        node.removeAttribute("style");
    });

    const ellipses = bio.querySelectorAll(".bcTruncateEllipsis, .peekaboo-ellipsis");
    ellipses.forEach(node => node.remove());

    const linkSpans = bio.querySelectorAll<HTMLAnchorElement>("span > a");
    linkSpans.forEach(link => {
        const text = link.textContent ? link.textContent.trim().toLowerCase() : "";
        if (text === "more" || text === "less") {
            const container = link.closest("span") ?? link;
            container.remove();
        }
    });

    const peekabooLinks = bio.querySelectorAll(".peekaboo-link");
    peekabooLinks.forEach(node => node.remove());
};

expandBio();

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches("#bio-text") || node.querySelector("#bio-text")) {
                expandBio(node);
            }
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
