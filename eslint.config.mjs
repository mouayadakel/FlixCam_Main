import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Kept as warn: alt-text, anonymous-default-export (low noise)
      'jsx-a11y/alt-text': 'warn',
      'import/no-anonymous-default-export': 'warn',
      // Off until incrementally fixed: setState-in-effect and deps need per-file refactors
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/incompatible-library': 'off',
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'coverage/**',
    'dist/**',
    '.turbo/**',
    '.history/**',
    'docs/**',
    '*.lock',
    '.env',
    '.env*.local',
  ]),
])

export default eslintConfig
