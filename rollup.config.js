/**
 * Rollup Config
 *
 * Use with:
 *   rollup -c
 */

const rNode = require('@rollup/plugin-node-resolve');
const rCJS = require('@rollup/plugin-commonjs');
const rJSON = require('@rollup/plugin-json');
const rReplace = require('@rollup/plugin-replace');

const {env} = require('node:process');
const prod = env.NODE_ENV == 'production';

const fs = require('node:fs');
const defaultsYML = fs.readFileSync('./defaults.yml', {encoding: 'utf8'});

module.exports = {
	input: 'src/main.js',
	output: {
		name: 'keycomfort',
		file: 'dist/keycomfort.js',
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
		rJSON(),
		rReplace({
			preventAssignment: true,
			values: {
				'ROLLUP_REPLACE.defaultsYML': JSON.stringify(defaultsYML),
			}
		})
	],
	watch: {
		include: [
			'src/**',
			'defaults.yml',
			'package.json',
		],
	}
};

