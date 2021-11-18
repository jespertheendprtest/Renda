const rulesDirPlugin = require("eslint-plugin-rulesdir");
rulesDirPlugin.RULES_DIR = "./.eslintrules";

module.exports = {
	root: true,
	parser: "@babel/eslint-parser",
	parserOptions: {
		requireConfigFile: false,
	},
	env: {
		browser: true,
		es2021: true,
	},
	extends: "eslint:recommended",
	plugins: [
		"jsdoc",
		"rulesdir",
	],
	settings: {
		jsdoc: {
			mode: "typescript",
		},
	},
	rules: {
		"no-constant-condition": ["error", {checkLoops: false}],
		"no-undef": "off", // Taken care of by TypeScript

		"array-callback-return": "error",
		"consistent-return": "error",
		curly: ["error", "multi-line", "consistent"],
		"default-param-last": "error",
		"grouped-accessor-pairs": "error",
		"guard-for-in": "error",
		"max-classes-per-file": ["error", 1],
		"no-caller": "error",
		"no-constructor-return": "error",
		"no-empty-pattern": "error",
		"no-eval": "error",
		"no-extend-native": "error",
		"no-extra-bind": "error",
		"no-extra-label": "error",
		"no-floating-decimal": "error",
		"no-implicit-coercion": ["error", {allow: ["!!", "*"]}],
		"no-implicit-globals": ["error", {lexicalBindings: true}],
		"no-implied-eval": "error",
		"no-invalid-this": "error",
		"no-multi-spaces": "error",
		"no-multi-str": "error",
		"no-new": "error",
		"no-new-func": "error",
		"no-new-wrappers": "error",
		"no-proto": "error",
		"no-return-assign": "error",
		"no-self-compare": "error",
		"no-sequences": "error",
		"no-throw-literal": "error",
		"no-unmodified-loop-condition": "error",
		"no-unused-expressions": "error",
		"no-useless-call": "error",
		"no-useless-catch": "error",
		"no-useless-concat": "error",
		"no-useless-return": "error",
		"no-void": "error",
		"prefer-named-capture-group": "error",
		"prefer-promise-reject-errors": "error",
		"prefer-regex-literals": "error",
		radix: "error",
		yoda: "error",
		"no-undef-init": "error",
		"no-unused-vars": ["error", {args: "none", vars: "local"}],
		"no-use-before-define": "error",

		"array-bracket-newline": ["error", {multiline: true}],
		"array-bracket-spacing": ["error", "never"],
		"array-element-newline": [
			"error",
			{
				ArrayExpression: "consistent",
				ArrayPattern: "consistent",
			},
		],
		"brace-style": "error",
		camelcase: [
			"error",
			{
				properties: "always",
				ignoreImports: true,
			},
		],
		"comma-dangle": [
			"error",
			{
				arrays: "always-multiline",
				objects: "always-multiline",
				imports: "always-multiline",
				exports: "always-multiline",
				functions: "never",
			},
		],
		"comma-spacing": [
			"error",
			{
				before: false,
				after: true,
			},
		],
		"comma-style": ["error", "last"],
		"computed-property-spacing": "error",
		"eol-last": "error",
		"func-call-spacing": "error",
		"function-paren-newline": ["error", "multiline"],
		"implicit-arrow-linebreak": "error",
		indent: [
			"error",
			"tab",
			{
				SwitchCase: 1,
			},
		],
		"key-spacing": "error",
		"keyword-spacing": "error",
		"linebreak-style": "error",
		"multiline-ternary": ["error", "never"],
		"new-cap": "error",
		"new-parens": "error",
		"no-array-constructor": "error",
		"no-multi-assign": "error",
		"no-multiple-empty-lines": ["error", {max: 1}],
		"no-nested-ternary": "error",
		"no-new-object": "error",
		"no-trailing-spaces": "error",
		"no-underscore-dangle": ["error", {allowAfterThis: true}],
		"no-unneeded-ternary": "error",
		"no-whitespace-before-property": "error",
		"object-curly-newline": [
			"error",
			{
				multiline: true,
				consistent: true,
			},
		],
		"object-curly-spacing": "error",
		"one-var": ["error", "never"],
		"operator-linebreak": "error",
		"padded-blocks": ["error", "never"],
		"prefer-exponentiation-operator": "error",
		"prefer-object-spread": "error",
		"quote-props": ["error", "as-needed"],
		quotes: ["error", "double", {avoidEscape: true}],
		semi: "error",
		"semi-spacing": "error",
		"semi-style": "error",
		"space-before-blocks": "error",
		"space-before-function-paren": [
			"error",
			{
				named: "never",
				anonymous: "never",
				asyncArrow: "always",
			},
		],
		"space-in-parens": "error",
		"space-infix-ops": "error",
		"space-unary-ops": [
			"error",
			{
				words: true,
				nonwords: false,
			},
		],
		"spaced-comment": ["error", "always"],
		"switch-colon-spacing": "error",
		"template-tag-spacing": "error",
		"unicode-bom": "error",
		"arrow-parens": ["error", "as-needed"],
		"arrow-spacing": "error",
		"generator-star-spacing": "error",
		"no-confusing-arrow": "error",
		"no-duplicate-imports": "error",
		"no-new-symbol": "error",
		"no-this-before-super": "error",
		"no-useless-computed-key": ["error", {enforceForClassMembers: true}],
		"no-useless-constructor": "error",
		"no-useless-rename": "error",
		"no-var": "error",
		"object-shorthand": "error",
		"prefer-arrow-callback": "error",
		"prefer-const": ["error", {destructuring: "all"}],
		"prefer-numeric-literals": "error",
		"prefer-rest-params": "error",
		"prefer-spread": "error",
		"rest-spread-spacing": "error",
		"sort-imports": ["error", {ignoreDeclarationSort: true}],
		"symbol-description": "error",
		"template-curly-spacing": "error",
		"yield-star-spacing": "error",

		"jsdoc/check-alignment": "error",
		"jsdoc/check-indentation": "error",
		"jsdoc/check-param-names": "error",
		"jsdoc/check-property-names": "error",
		"jsdoc/check-types": "error",
		"jsdoc/newline-after-description": ["error", "never"],
		"jsdoc/no-bad-blocks": "error",
		"jsdoc/no-defaults": "error",
		"jsdoc/no-multi-asterisks": "error",
		"jsdoc/no-undefined-types": [
			"error",
			{
				definedTypes: [
					"ConstructorParameters",
					"Generator",
					"AsyncGenerator",
					"BufferSource",
					"BlobPart",
					"MessageEventSource",
					"FileSystemHandle",
					"FileSystemFileHandle",
					"FileSystemDirectoryHandle",
					"FileSystemWritableFileStream",
					"RTCSessionDescriptionInit",
					"RTCSessionDescriptionInit",
					"RTCIceCandidateInit",
					"RTCDataChannelInit",
					"PromiseFulfilledResult",
					"GPUIndexFormat",
					"GPUTextureFormat",
					"GPURenderPassColorAttachment",
					"GPURenderPassDepthStencilAttachment",
					"GPURenderPassDescriptor",
					"GPUDevice",
					"GPUBindGroupLayout",
					"GPUBufferUsage",
					"GPUBuffer",
					"GPUBindGroup",
					"GPUCommandEncoder",
					"Parameters",
					"suspiciousCode",
				],
			},
		],
		"jsdoc/require-asterisk-prefix": "error",
		"jsdoc/require-description-complete-sentence": [
			"error",
			{newlineBeforeCapsAssumesBadSentenceEnd: true},
		],
		"jsdoc/require-hyphen-before-param-description": [
			"error",
			"never",
			{tags: {"*": "never"}},
		],
		"jsdoc/require-param-name": "error",
		"jsdoc/require-param-type": "error",
		"jsdoc/require-param": "error",
		"jsdoc/require-property": "error",
		"jsdoc/require-property-name": "error",
		"jsdoc/require-property-type": "error",
		"jsdoc/require-returns-check": "error",
		"jsdoc/require-returns-type": "error",
	},
};
