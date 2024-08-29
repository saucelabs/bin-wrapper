const ts = require('typescript-eslint');
const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const jest = require('eslint-plugin-jest');

module.exports = ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettier,
  {
    ignores: ['lib/**'],
  },
  {
    files: ['**/*.js', '**/*.ts'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'warn',
    },
  },
  {
    files: ['tests/**/*.*js', 'tests/**/*.*ts'],
    ...jest.configs['flat/recommended'],
    rules: {
      'jest/no-jasmine-globals': 'off',
    },
  },
  {
    languageOptions: {
      globals: {
        __dirname: true,
        console: true,
        exports: true,
        module: true,
        require: true,
        process: true,
        Buffer: true,
        URL: true,
        NodeJS: true,
        fail: true,
      },
    },
  },
);
