/**
 * @see https://commitlint.js.org/#/reference-configuration
 * @type {import('@commitlint/types').UserConfig}
 */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-empty': [2, 'never'],
    'body-min-length': [2, 'always', 40],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'always', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};

module.exports = config;
