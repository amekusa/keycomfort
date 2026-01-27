#!/usr/bin/env node

const {env, cwd, stdin, stdout} = require('node:process');
const {spawnSync: spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const {Command, Argument} = require('commander');
const yaml = require('yaml');
const {io, merge, isEmpty} = require('@amekusa/util.js');
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

const pkg = require('../package.json');
const rules = require('./rules.js');
const defaultsYML = ROLLUP_REPLACE.defaultsYML;
const defaults = yaml.parse(defaultsYML);
const defaultConfig = loc(io.home, '.config', 'keycomfort', 'config.yml')

const options = {
	verbose: false,
};

const {log, warn} = console;

function debug(...args) {
	if (options.verbose) console.debug(...args);
}

function loc(...args) {
	return io.untilde(path.join(...args));
}

function yes(answer) {
	return typeof answer == 'string' && answer.trim().match(/^(?:y|yes)$/i);
}

function no(answer) {
	return typeof answer == 'string' && answer.trim().match(/^(?:n|no)$/i);
}

function edit(file) {
	return spawn(env.EDITOR || env.VISUAL || 'vi', [file], {
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
	if (Array.isArray(key)) return key.map(I => label(I.trim(), dict)).join(', ');
	key = `${key}`.trim();
	if (key.includes(',')) return label(key.split(','), dict);
	if (key.includes('+')) return key.split('+').map(I => label(I.trim(), dict)).join(' + ');
	if (key in dict) return dict[key];
	let lr = ''; // left or right
	let m = key.match(/^(left|right)_([_a-z0-9]+)$/i);
	if (m) {
		lr = m[1] == 'left' ? 'L-' : 'R-';
		key = m[2];
	}
	return lr + key.split('_').map(I => I.charAt(0).toUpperCase() + I.slice(1)).join(' ');
}

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
	.argument('[file]', `config file`, defaultConfig)
	.option('-r, --reset', `reset config with defaults`)
	.option('-D, --delete', `delete config`)
	.action(configure);

app.command('generate')
	.alias('gen')
	.description(`generate keymaps`)
	.addArgument(new Argument('[target]', `target application`).choices(['karabiner', 'ahk']).default('karabiner'))
	.option('-c, --config <path>', `config file`, defaultConfig)
	.option('-d, --no-config', `do not use config, use only default values`)
	.option('-s, --save', `save generated keymaps`, true)
	.option('--no-save', `do not save generated keymaps`)
	.option('-a, --apply', `apply generated keymaps (only for karabiner)`, true)
	.option('--no-apply', `do not apply generated keymaps`)
	.option('-p, --print', `print results`)
	.action(generate);

app.parse();

/**
 * Create/Edit/Reset/Delete config file.
 */
function configure(file, opts = {}) {
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
	let apps     = config.apps;
	let labels   = config.key_labels;
	let vim      = config.vim_like;

	let ruleSet = new RuleSet('KeyComfort');

	function addRule(rule, rc, desc = undefined) {
		// overwrite conf with vim-like mappings
		if (vim && rc.vim) rc = merge(rc, rc.vim);

		// format rule description
		if (!desc) {
			desc = rc.desc.replaceAll(/(?:<modifier>|\[([_0-9a-z]+)\])/gi, (_, m1) => {
				return label(m1 ? rc[m1] : modifier, labels);
			});
		}

		// apply rule
		if (typeof rule == 'function') {
			rule(rc, ruleSet.add(desc));
			return;
		}

		// apply app-specific rules
		if (rule.apps) {
			let newRule;
			let enabled = []; // enabled apps
			for (let app in rule.apps) {
				if (app == 'others') continue;
				if (!apps[app]) continue; // uknown app
				if (!apps[app].enable) continue; // globally disabled
				if (!rc.apps[app]) continue; // disabled for this rule
				if (isEmpty(apps[app].id)) continue; // no app-id
				enabled = enabled.concat(apps[app].id);
				newRule = ruleSet.add(desc + ` (${app})`);
				newRule.cond(if_app(...apps[app].id));
				rule.apps[app](rc, newRule);
			}
			if (apps.others.enable && rc.apps.others) {
				newRule = ruleSet.add(desc);
				if (enabled.length) newRule.cond(unless_app(...enabled));
				rule.apps.others(rc, newRule);
			}
			delete rule.apps;
		}

		// apply branching rules
		for (let k in rule) {
			addRule(rule[k], rc, `${desc} :: ${k}`); // RECURSION
		}
	}

	for (let i in rules) {
		// rule config
		let rc = config.rules[i];
		if (!rc) continue;
		if (!rc.enable) continue; // rule disabled

		addRule(rules[i], rc);
	}

	let data = ruleSet.toJSON();
	let result = JSON.stringify(data, null, 2);

	if (opts.print) log(result);

	if (opts.apply) {
		switch (target) {
		case 'karabiner':
			let conf = new Config();
			conf.setIO(loc(config.paths.karabiner.apply_to), {
					encoding: 'utf8',
					backup: true,
					backupExt: '.bak',
				})
				.load()
				.setRules(data.rules)
				.save();
			break;
		case 'ahk':
			warn(`Applying to ahk is not supported`);
			break;
		}
	}

	if (opts.save) {
		let saveAs;
		switch (target) {
		case 'karabiner':
			saveAs = loc(config.paths.karabiner.save_as);
			break;
		case 'ahk':
			saveAs = loc(config.paths.ahk.save_as);
			break;
		}
		fs.writeFileSync(saveAs, result, {encoding: 'utf8'});
	}

}

