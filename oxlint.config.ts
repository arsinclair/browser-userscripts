import { defineConfig } from "oxlint";

export default defineConfig({
    options: {
        typeAware: true
    },
    env: {
        browser: true,
        greasemonkey: true,
        node: true
    }
});
