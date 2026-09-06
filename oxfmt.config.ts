import { defineConfig } from "oxfmt";

export default defineConfig({
    printWidth: 100,
    semi: true,
    singleQuote: false,
    trailingComma: "none",
    tabWidth: 4,
    useTabs: false,
    bracketSpacing: true,
    arrowParens: "avoid",
    endOfLine: "lf",
    insertFinalNewline: true,
    proseWrap: "preserve",
    ignorePatterns: ["pnpm-lock.yaml", "user-styles/**/*.css"],
    sortImports: true,
    overrides: [
        {
            files: ["**/*.yml", "**/*.yaml"],
            options: { tabWidth: 2 }
        }
    ]
});
