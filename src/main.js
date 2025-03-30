#!/usr/bin/env node

const {env, stdin, stdout} = require('node:process');
const {spawnSync: spawn} = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const {Command, Argument, Option} = require('commander');
const yaml = require('yaml');
const {merge, isEmpty} = require('@amekusa/util.js');
const {
	RuleSet, Config,
	if_app, unless_app,
} = require('karabinerge');

/*!
 * === KEYCOMFORT === *
 * github.com/amekusa/keycomfort
 * ------------------------------ *
 *
 * MIT License
 *
 * Copyright (c) 2024 Satoshi Soma
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

const rules = require('./rules.js');
const pkg = require('../package.json');
const defaultsYML = ROLLUP_REPLACE.defaultsYML;
const defaults = yaml.parse(defaultsYML);

const home = os.homedir();
const options = {
	verbose: false,
};

const {
	log, error,
	warning: warn
} = console;

function loc(...args) {
	return io.untilde(path.join(...args));
}

function yes(answer) {
	return typeof answer == 'string' && answer.trim().match(/^(?:y|yes)$/i);
}

function no(answer) {
	return typeof answer == 'string' && answer.trim().match(/^(?:n|no)$/i);
}

function debug(...args) {
	if (options.verbose) console.debug(...args);
}

function edit(file) {
	let editor = spawn(env.EDITOR || env.VISUAL || 'nano', [file], {
		stdio: 'inherit',
		detached: true,
	});
}

function prompt(msg, fn) {
	let ask = readline.createInterface({input: stdin, output: stdout});
	return ask.question(msg, answer => {
		ask.close();
		return fn(answer);
	});
}

function label(key, dict) {
	if (Array.isArray(key)) return key.map(I => label(I, dict)).join(',');
	key += '';
	if (key in dict) return dict[key];
	return key.split('_').map(I => I.charAt(0).toUpperCase() + I.slice(1)).join(' ');
}

const paths = {
	config: {
		dir: path.join(home, '.config', 'keycomfort'),
		file: 'config.yml',
	},
	dist: {
		dir: path.join(home, '.config', 'keycomfort'),
		karabiner: 'keycomfort-karabiner.json',
		ahk:       'keycomfort.ahk',
	},
};

const app = new Command();

app.name(pkg.name)
	.version(pkg.version)
	.description(pkg.description)
	.option('-v, --verbose', `output detailed messages for debug`)
	.hook('preAction', (app, cmd) => {
		Object.assign(options, app.opts());
		debug(` global options:`, options);
		debug(`command options:`, cmd.opts());
	});

app.command('configure')
	.alias('config')
	.description(`create/edit/reset/delete config`)
	.argument('[file]', `config file`, loc(paths.config.dir, paths.config.file))
	.option('-r, --reset', `reset config with defaults`)
	.option('-D, --delete', `delete config`)
	.action(configure);

app.command('generate')
	.alias('gen')
	.description(`generate keymaps`)
	.addArgument(new Argument('<target>', `target application`).choices([
		'all', 'karabiner', 'ahk',
	]))
	.option('-c, --config <src>', `config file`, path.join(paths.config.dir, paths.config.file))
	.option('--no-config', `do not use config, use default values`)
	.option('-s, --save-to <dst>', `save destination`)
	.option('-n, --no-save', `do not save to files`)
	.option('-r, --reload', `reload keymaps (only for karabiner)`)
	.option('-p, --print', `print results`)
	.action(generate);

app.parse();

/**
 * Create/Edit/Reset/Delete config file.
 */
function configure(file, opts = {}) {
	debug(`options:`, opts);

	// check options
	if (opts.reset && opts.delete) {
		return app.error(`--reset and --delete options are mutually exclusive`);
	}
	// check if directory exists
	let dir = path.dirname(file);
	if (!fs.existsSync(dir)) {
		if (opts.reset || opts.delete) {
			return app.error(`File not found: ${file}`);
		}
		return prompt(`Create directory '${dir}' ? [Yes/Cancel] `, answer => {
			if (yes(answer)) {
				debug(`Creating:`, dir, `...`);
				fs.mkdirSync(dir, {recursive: true});
				debug(`> Done.`);
				return configure(file);
			}
			log(`Canceled.`);
		});
	}
	// check if file exists
	if (!fs.existsSync(file)) {
		if (opts.reset || opts.delete) {
			return app.error(`File not found: ${file}`);
		}
		log(`Creating:`, file, `...`);
		return prompt(`Copy default config? [Yes/No(create empty)/Cancel] `, answer => {
			if (yes(answer)) {
				fs.writeFileSync(file, defaultsYML, {encoding: 'utf8'});
				debug(`Copied default config to:`, file);
				return configure(file);
			} else if (no(answer)) {
				fs.writeFileSync(file, '', {encoding: 'utf8'});
				debug(`Empty file created:`, file);
				return configure(file);
			}
			log(`Canceled.`);
		});
	}
	// reset file
	if (opts.reset) {
		return prompt(`Reset '${file}' with default config? [Yes/Cancel] `, answer => {
			if (yes(answer)) {
				fs.writeFileSync(file, defaultsYML, {encoding: 'utf8'});
				return log(`File overwritten with default config.`);
			}
			log(`Canceled.`);
		});
	}
	// delete file
	if (opts.delete) {
		return prompt(`Delete '${file}' ? [Yes/Cancel] `, answer => {
			if (yes(answer)) {
				debug(`Deleting:`, file, `...`);
				fs.rmSync(file);
				return log(`Deleted:`, file);
			}
			log(`Canceled.`);
		});
	}

	edit(file);
}

/**
 * Generate keymaps.
 */
function generate(target, opts = {}) {
	if (target == 'ahk') {
		return app.error(`sorry, ahk is not supported yet.`)
	}
	// parse config
	let config = defaults;
	if (opts.config) {
		if (!fs.existsSync(opts.config)) {
			log(`Config not found:`, opts.config);
			return prompt(`Use default config? [Yes/Cancel] `, answer => {
				if (yes(answer)) {
					opts.config = false;
					return generate(target, opts);
				}
				log(`Canceled.`);
			});
		}
		let userConfig = yaml.parse(fs.readFileSync(opts.config, {encoding: 'utf8'}));
		if (userConfig) config = merge(config, userConfig);
	}
	let modifier = config.rules.modifier.key;
	let apps = config.apps;
	let labels = config.key_labels;
	let vim = config.vim_like;

	// run rules
	let ruleSet = new RuleSet('KeyComfort');
	for (let i in rules) {

		// rule config
		let rc = config.rules[i];
		if (!rc) continue;
		if (!rc.enable) continue; // rule disabled

		// overwrite conf with vim-like mappings
		if (rc.vim && vim) rc = merge(rc, rc.vim);

		// format rule description
		let desc = rc.desc.replaceAll('<modifier>', label(modifier, labels));
		for (let i in rc) desc = desc.replaceAll(`[${i}]`, label(rc[i], labels));

		let rule = rules[i];
		let newRule;

		// non app-specific rule
		if (typeof rule == 'function') {
			newRule = ruleSet.add(desc);
			rule(rc, newRule);
			continue;
		}

		// app-specific rule
		let enabled = []; // enabled apps
		for (let app in rule) {
			if (app == 'others') continue;
			if (!apps[app]) continue; // invalid app
			if (!apps[app].enable) continue; // globally disabled
			if (!rc.apps[app]) continue; // disabled for this rule
			if (isEmpty(apps[app].id)) continue; // no app-id
			enabled = enabled.concat(apps[app].id);
			newRule = ruleSet.add(desc + ` (${app})`);
			newRule.cond(if_app(...apps[app].id));
			rule[app](rc, newRule);
		}
		if (apps.others.enable && rc.apps.others) {
			newRule = ruleSet.add(desc);
			if (enabled.length) newRule.cond(unless_app(...enabled));
			rule.others(rc, newRule);
		}
	}

	let result = JSON.stringify(ruleSet.toJSON(), null, 2);
	if (opts.print) log(result);
	if (!opts.save) return;

	let tasks = [];
	tasks.push(new Promise((done, fail) => {
		let data = ruleSet.toJSON();
		fs.writeFile(
			path.join(base, 'mac/keycomfort.json'),
			JSON.stringify(data, null, 2),
			{encoding: 'utf8'},
			err => {
				if (err) fail(err);
				let conf = new Config();
				conf.load()
					.backup()
					.setRules(data.rules)
					.save();

				done();
			}
		);
	}));

	Promise.all(tasks).then(() => {
		console.log('All done.');
	});
}

