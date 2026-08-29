import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      'src/**',
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],
  },
  {
    rules: {
      // App content is in French; escaping every apostrophe in JSX text is
      // impractical and this rule adds no real correctness/security value.
      'react/no-unescaped-entities': 'off',
      // These are new, experimental "React Compiler" rules (eslint-plugin-react-hooks@7).
      // The existing codebase predates them and uses common, intentional patterns
      // (e.g. fetch-on-mount) they flag. Keep them visible as warnings rather than
      // blocking merges until they're reviewed case-by-case.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];

export default eslintConfig;
