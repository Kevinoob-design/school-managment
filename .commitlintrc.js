/**
 * @see https://commitlint.js.org/#/reference-configuration
 * @type {import('@commitlint/types').UserConfig}
 */
const config = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'header-max-length': [2, 'always', 72],
		'header-case': [2, 'always', 'lower-case'],
		'body-leading-blank': [2, 'always'],
		'body-empty': [2, 'never'],
		'body-min-length': [2, 'always', 40],
		'body-case': [2, 'always', 'lower-case'],
		'scope-case': [2, 'always', 'lower-case'],
		'scope-empty': [2, 'never']
	}
}

export default config
