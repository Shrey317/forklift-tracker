import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['src/generated/**', '.next/**', 'node_modules/**'],
  },
];

export default eslintConfig;
