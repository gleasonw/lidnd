import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
	{
		ignores: [
			'.next/**',
			'out/**',
			'node_modules/**',
			'coverage/**',
			'**/*.min.*',
			'**/dist/**',
		],
	},

	js.configs.recommended,

	// Non-type-aware TS rules (safe, fast)
	...tseslint.configs.recommended,

	// Next.js
	nextPlugin.configs.recommended,
	nextPlugin.configs['core-web-vitals'],

	// Type-aware rules ONLY for TS/TSX
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parserOptions: {
				// This is the key: required for parserServices
				project: ['./tsconfig.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			// Add the type-aware recommended set here (instead of globally)
			...tseslint.configs.recommendedTypeChecked[0].rules,
			...tseslint.configs.recommendedTypeChecked[1].rules,

			// React Hooks
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',

			// Promises / async correctness
			'@typescript-eslint/no-floating-promises': [
				'error',
				{ ignoreIIFE: true, ignoreVoid: false },
			],
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: {
						attributes: true,
						arguments: false,
					},
				},
			],

			// Hygiene
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{ prefer: 'type-imports', fixStyle: 'separate-type-imports' },
			],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',

			'no-undef': 'off',
		},
	},
)
