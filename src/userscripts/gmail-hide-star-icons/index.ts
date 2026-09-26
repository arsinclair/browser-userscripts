const STAR_BUTTON_SELECTOR = [
    'span[role="button"][aria-label="Starred"]',
    'span[role="button"][aria-label="Not starred"]',
    'span[role="button"][aria-label^="Starred with "]'
].join(", ");

const SENDER_SELECTOR = "span[email]";
const CACHE_KEY = "gmail-hide-star-icons:favicons:v2";
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const IMAGE_LOAD_TIMEOUT_MS = 8_000;
const PAGE_LOAD_TIMEOUT_MS = 10_000;

const FAVICON_PATHS = [
    "/favicon.ico",
    "/favicon.png",
    "/favicon-16x16.png",
    "/apple-touch-icon.png"
];

interface FaviconCacheEntry {
    expiresAt: number;
    url: string | null;
}

const faviconCache = readFaviconCache();
const faviconPromises = new Map<string, Promise<string | null>>();

function readFaviconCache(): Record<string, FaviconCacheEntry> {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");

        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return {};
        }

        const now = Date.now();
        return Object.fromEntries(
            Object.entries(value).filter((entry): entry is [string, FaviconCacheEntry] => {
                const cached = entry[1];
                return (
                    typeof cached === "object" &&
                    cached !== null &&
                    "expiresAt" in cached &&
                    typeof cached.expiresAt === "number" &&
                    cached.expiresAt > now &&
                    "url" in cached &&
                    (typeof cached.url === "string" || cached.url === null)
                );
            })
        );
    } catch {
        return {};
    }
}

function cacheFavicon(domain: string, url: string | null): void {
    faviconCache[domain] = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        url
    };

    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(faviconCache));
    } catch {
        // Gmail still gets favicons for this session if storage is unavailable or full.
    }
}

function getSenderDomain(row: HTMLTableRowElement): string | null {
    const email = row.querySelector<HTMLElement>(SENDER_SELECTOR)?.getAttribute("email")?.trim();
    const atIndex = email?.lastIndexOf("@") ?? -1;

    if (!email || atIndex < 0) {
        return null;
    }

    const domain = email
        .slice(atIndex + 1)
        .toLowerCase()
        .replace(/\.$/, "");
    const labels = domain.split(".");
    const isValid = labels.every(label => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label));

    return isValid ? domain : null;
}

function getDomainCandidates(domain: string): string[] {
    const labels = domain.split(".");
    const lastCandidateIndex = Math.max(0, labels.length - 2);

    return labels.slice(0, lastCandidateIndex + 1).map((_, index) => labels.slice(index).join("."));
}

function isImageBlob(value: unknown): value is Blob {
    return value instanceof Blob && value.size > 0 && value.type.toLowerCase().startsWith("image/");
}

function canLoadImage(url: string): Promise<boolean> {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            timeout: IMAGE_LOAD_TIMEOUT_MS,
            responseType: "blob",
            headers: {
                Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            },
            onload: response => {
                resolve(
                    response.status >= 200 &&
                        response.status < 300 &&
                        isImageBlob(response.response)
                );
            },
            onabort: () => resolve(false),
            onerror: () => resolve(false),
            ontimeout: () => resolve(false)
        });
    });
}

function requestPage(url: string): Promise<{ body: string; finalUrl: string } | null> {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: "GET",
            url,
            timeout: PAGE_LOAD_TIMEOUT_MS,
            headers: {
                Accept: "text/html,application/xhtml+xml"
            },
            onload: response => {
                if (
                    response.status < 200 ||
                    response.status >= 300 ||
                    typeof response.responseText !== "string"
                ) {
                    resolve(null);
                    return;
                }

                resolve({ body: response.responseText, finalUrl: response.finalUrl || url });
            },
            onabort: () => resolve(null),
            onerror: () => resolve(null),
            ontimeout: () => resolve(null)
        });
    });
}

function decodeHtmlAttribute(value: string): string {
    return value.replace(
        /&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt));/gi,
        (_, decimal, hex, name) => {
            if (decimal) {
                return String.fromCodePoint(Number.parseInt(decimal, 10));
            }

            if (hex) {
                return String.fromCodePoint(Number.parseInt(hex, 16));
            }

            const entities: Record<string, string> = {
                amp: "&",
                apos: "'",
                gt: ">",
                lt: "<",
                quot: '"'
            };

            return entities[String(name).toLowerCase()] ?? "";
        }
    );
}

function getTagAttributes(tag: string): Record<string, string> {
    const source = tag.replace(/^<\s*[\w:-]+\s*/i, "").replace(/\/?>\s*$/, "");
    const attributes: Record<string, string> = {};
    const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

    for (const match of source.matchAll(pattern)) {
        const name = match[1]?.toLowerCase();

        if (name) {
            attributes[name] = decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? "");
        }
    }

    return attributes;
}

function getDeclaredFaviconUrls(html: string, pageUrl: string): string[] {
    const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
    const baseHref = baseTag ? getTagAttributes(baseTag)["href"] : undefined;
    let baseUrl = pageUrl;

    if (baseHref) {
        try {
            baseUrl = new URL(baseHref, pageUrl).href;
        } catch {
            // Ignore an invalid base element and resolve icons against the page URL.
        }
    }

    const links = [...html.matchAll(/<link\b[^>]*>/gi)]
        .map(match => getTagAttributes(match[0]))
        .filter(attributes =>
            (attributes["rel"] ?? "")
                .toLowerCase()
                .split(/\s+/)
                .some(value => value === "icon" || value.endsWith("-icon"))
        )
        .sort((left, right) => {
            const is16By16 = (attributes: Record<string, string>): boolean =>
                (attributes["sizes"] ?? "").toLowerCase().split(/\s+/).includes("16x16");

            return Number(is16By16(right)) - Number(is16By16(left));
        });
    const urls = new Set<string>();

    for (const attributes of links) {
        const href = attributes["href"];

        if (!href) {
            continue;
        }

        try {
            const url = new URL(href, baseUrl);

            if (url.protocol === "https:" || url.protocol === "http:") {
                urls.add(url.href);
            }
        } catch {
            // Ignore malformed icon URLs and continue with the remaining declarations.
        }
    }

    return [...urls];
}

async function findDeclaredFavicon(domain: string): Promise<string | null> {
    const page = await requestPage(`https://${domain}/`);

    if (!page) {
        return null;
    }

    for (const url of getDeclaredFaviconUrls(page.body, page.finalUrl)) {
        if (await canLoadImage(url)) {
            return url;
        }
    }

    return null;
}

async function findFaviconForDomain(domain: string): Promise<string | null> {
    const cached = faviconCache[domain];

    if (cached && cached.expiresAt > Date.now()) {
        if (cached.url === null || (await canLoadImage(cached.url))) {
            return cached.url;
        }
    }

    for (const path of FAVICON_PATHS) {
        const url = `https://${domain}${path}`;

        if (await canLoadImage(url)) {
            cacheFavicon(domain, url);
            return url;
        }
    }

    const declaredUrl = await findDeclaredFavicon(domain);

    if (declaredUrl) {
        cacheFavicon(domain, declaredUrl);
        return declaredUrl;
    }

    cacheFavicon(domain, null);
    return null;
}

function getFaviconForDomain(domain: string): Promise<string | null> {
    const pending = faviconPromises.get(domain);

    if (pending) {
        return pending;
    }

    const promise = findFaviconForDomain(domain).finally(() => {
        faviconPromises.delete(domain);
    });
    faviconPromises.set(domain, promise);
    return promise;
}

async function resolveFavicon(domain: string): Promise<string | null> {
    for (const candidate of getDomainCandidates(domain)) {
        const url = await getFaviconForDomain(candidate);

        if (url) {
            if (candidate !== domain) {
                cacheFavicon(domain, url);
            }

            return url;
        }
    }

    return null;
}

function replaceStarIcons(root: ParentNode): void {
    const starButtons = root.querySelectorAll<HTMLElement>(STAR_BUTTON_SELECTOR);

    if (root instanceof HTMLElement && root.matches(STAR_BUTTON_SELECTOR)) {
        replaceStarIcon(root);
    }

    starButtons.forEach(replaceStarIcon);
}

function replaceStarIcon(starButton: HTMLElement): void {
    const cell = starButton.closest("td");
    const row = starButton.closest("tr");

    if (!(cell instanceof HTMLTableCellElement) || !(row instanceof HTMLTableRowElement)) {
        return;
    }

    const domain = getSenderDomain(row);
    cell.replaceChildren();

    if (!domain) {
        return;
    }

    cell.dataset["senderFaviconDomain"] = domain;

    void resolveFavicon(domain).then(url => {
        if (
            !url ||
            !cell.isConnected ||
            cell.dataset["senderFaviconDomain"] !== domain ||
            getSenderDomain(row) !== domain
        ) {
            return;
        }

        const image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.title = domain;
        image.width = 16;
        image.height = 16;
        image.referrerPolicy = "no-referrer";
        image.decoding = "async";
        image.style.display = "block";
        image.style.margin = "auto";
        cell.replaceChildren(image);
    });
}

const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node instanceof Element || node instanceof DocumentFragment) {
                replaceStarIcons(node);
            }
        }
    }
});

observer.observe(document, { childList: true, subtree: true });
replaceStarIcons(document);
