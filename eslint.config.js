import nx from '@nx/eslint-plugin'

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/react'],
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**'],
  },
]
