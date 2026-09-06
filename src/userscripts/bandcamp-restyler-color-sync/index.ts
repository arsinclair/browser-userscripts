export {};

const ROOT = document.documentElement;
const VAR_TEXT = "--bc-restyler-text-color";
const VAR_BORDER = "--bc-restyler-border-color";
const VAR_GRADIENT_START = "--bc-restyler-gradient-start";
const VAR_GRADIENT_END = "--bc-restyler-gradient-end";
const VAR_BG = "--bc-restyler-page-bg";

const normalizeHex = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith("#")) return null;
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
        return `#${hex.charAt(0).repeat(2)}${hex.charAt(1).repeat(2)}${hex.charAt(2).repeat(2)}`;
    }
    if (hex.length === 6 || hex.length === 8) {
        return `#${hex}`;
    }
    return null;
};

const withAlpha = (hex: string, alphaHex: string): string | null => {
    const base = normalizeHex(hex);
    if (!base || base.length !== 7) return null;
    return `${base}${alphaHex}`;
};

const extractPgBdColors = (): { text: string | null; bg: string | null } | null => {
    const styleTag = document.querySelector<HTMLStyleElement>("#custom-design-rules-style");
    if (!styleTag?.textContent) return null;
    const match = styleTag.textContent.match(/#pgBd\s*\{[\s\S]*?\}/i);
    if (!match) return null;
    const block = match[0];
    const colorMatch = block.match(/color\s*:\s*(#[0-9a-f]{3,8})/i);
    const bgMatch = block.match(/background\s*:\s*(#[0-9a-f]{3,8})/i);
    return {
        text: normalizeHex(colorMatch?.[1]),
        bg: normalizeHex(bgMatch?.[1])
    };
};

const applyFromPgBd = (pgBd: Element | null): boolean => {
    if (!pgBd) return false;
    const extracted = extractPgBdColors();
    const text = extracted?.text ?? null;
    const bg = extracted?.bg ?? null;

    if (text) {
        ROOT.style.setProperty(VAR_TEXT, text);
        ROOT.style.setProperty(VAR_BORDER, text);
        const start = withAlpha(text, "0d");
        const end = withAlpha(text, "08");
        if (start) ROOT.style.setProperty(VAR_GRADIENT_START, start);
        if (end) ROOT.style.setProperty(VAR_GRADIENT_END, end);
    }

    if (bg) {
        ROOT.style.setProperty(VAR_BG, bg);
    }

    return Boolean(text || bg);
};

const attachObserver = (pgBd: Element): void => {
    const observer = new MutationObserver(() => {
        applyFromPgBd(pgBd);
    });
    observer.observe(pgBd, { attributes: true, attributeFilter: ["style", "class"] });
};

const init = (): boolean => {
    const pgBd = document.querySelector("#pgBd");
    if (!pgBd) return false;
    applyFromPgBd(pgBd);
    attachObserver(pgBd);
    return true;
};

const boot = (): void => {
    if (init()) return;
    const observer = new MutationObserver(() => {
        if (init()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
    boot();
}
