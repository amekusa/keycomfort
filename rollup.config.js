/**
 * Rollup Config
 *
 * Use with:
 *   rollup -c rollup.js
 */

const {env} = require('node:process');
const prod = env.NODE_ENV == 'production';

const rNode = require('@rollup/plugin-node-resolve');
const rCJS = require('@rollup/plugin-commonjs');

module.exports = {
	input: 'src/main.js',
	output: {
		name: 'keycomfort',
		file: 'dist/bundle.js',
		format: 'cjs',
		indent: !prod,
		sourcemap: !prod,
		compact: prod,
	},
	treeshake: true,
	plugins: [
		rCJS(),
		rNode({ // support importing npm packages
			browser: false,
		}),
	],
};

