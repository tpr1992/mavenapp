import js from "@eslint/js"
import tseslint from "typescript-eslint"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import prettier from "eslint-config-prettier"

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ["src/**/*.{js,jsx,ts,tsx}"],
        plugins: {
            react,
            "react-hooks": reactHooks,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly",
                URL: "readonly",
                localStorage: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                HTMLElement: "readonly",
                Event: "readonly",
                IntersectionObserver: "readonly",
                ResizeObserver: "readonly",
                MutationObserver: "readonly",
                AbortController: "readonly",
                URLSearchParams: "readonly",
                history: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-empty": ["error", { allowEmptyCatch: true }],
            "react/jsx-uses-react": "error",
            "react/jsx-uses-vars": "error",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
        settings: {
            react: { version: "detect" },
        },
    },
    {
        ignores: ["dist/", "node_modules/", "locl-app.jsx"],
    },
]
