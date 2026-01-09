import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        rules: {
            // Prefer const over let when variable is never reassigned
            'prefer-const': 'error',

            // Disallow unused variables (allow underscore prefix for intentionally unused)
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // Enforce consistent use of type imports
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports' },
            ],

            // Allow explicit any in specific cases (can be tightened later)
            '@typescript-eslint/no-explicit-any': 'warn',

            // Require explicit return types on functions (can be tightened later)
            '@typescript-eslint/explicit-function-return-type': 'warn',

            // Allow floating promises with void operator
            '@typescript-eslint/no-floating-promises': [
                'error',
                { ignoreVoid: true },
            ],

            // Require await in async functions
            '@typescript-eslint/require-await': 'warn',

            // Disallow unsafe member access on any
            '@typescript-eslint/no-unsafe-member-access': 'warn',
            '@typescript-eslint/no-unsafe-assignment': 'warn',
            '@typescript-eslint/no-unsafe-argument': 'warn',
            '@typescript-eslint/no-unsafe-return': 'warn',
            '@typescript-eslint/no-unsafe-call': 'warn',
        },
    },
    {
        // admin-html.ts contains embedded JavaScript in template literals
        // Regex patterns inside strings trigger false positives for no-useless-escape
        files: ['**/admin-html.ts'],
        rules: {
            'no-useless-escape': 'off',
        },
    },
    {
        ignores: ['dist/**', 'node_modules/**', 'scripts/**', '*.cjs'],
    }
);
