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
	RuleSet,
	Config,
	key,
	click,
	set_var,
	if_var, unless_var,
	if_app, unless_app,
	if_lang, unless_lang,
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

function yn(x) {
	if (typeof x == 'string') {
		if (x.match(/^(?:y|yes|true)$/i)) return true;
		if (x.match(/^(?:n|no|false)$/i)) return false;
	}
	return !!x;
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
		debug(`options:`, options);
		debug(`command options:`, cmd.opts());
	});

app.command('configure')
	.alias('config')
	.description(`create/edit/reset/delete config`)
	.argument('[file]', `config file`, path.join(paths.config.dir, paths.config.file))
	.option('-r, --reset', `reset config with defaults`)
	.option('-d, --delete', `delete config`)
	.action(configure);

app.command('generate')
	.alias('gen')
	.description(`generate keymaps`)
	.addArgument(new Argument('<target>', `target application`).choices([
		'all', 'karabiner', 'ahk',
	]))
	.option('-c, --config <src>', `config file`, path.join(paths.config.dir, paths.config.file))
	.option('-s, --save <dst>', `save destination`)
	.option('-n, --no-save', `do not save to files`)
	.option('-r, --reload', `reload keymaps (only for karabiner)`)
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

	// ---- RULE DEFINITIONS ---- //
	let modifier = config.rules.modifier.key;
	let modding = if_var('keycomfort_layer', 1);
	let any = {optional: 'any'};
	let rules = {

		'modifier'(c, r) {
			r.cond(unless_var('keycomfort_layer_disable', 1))
			.remap({
				from:            key(c.key, any),
				to:              set_var('keycomfort_layer', 1, {lazy: true}),
				to_after_key_up: set_var('keycomfort_layer', 0),
				to_if_alone:     key(c.alone)
			})
		},

		'cancel modifier'(c, r) {
			r.remap({
				from: key(c.key, any),
				to: [
					set_var('keycomfort_layer_disable', 1),
					key(c.key)
				],
				to_after_key_up: set_var('keycomfort_layer_disable', 0)
			})
		},

		'arrows'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.up, any),
				to:   key('up_arrow')
			})
			.remap({
				from: key(c.right, any),
				to:   key('right_arrow')
			})
			.remap({
				from: key(c.down, any),
				to:   key('down_arrow')
			})
			.remap({
				from: key(c.left, any),
				to:   key('left_arrow')
			})
		},

		'page up/down'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.up),
				to:   key('page_up')
			})
			.remap({
				from: key(c.down),
				to:   key('page_down')
			})
		},

		'prev/next word': {
			sonicpi(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.prev),
					to:   key('b', 'command')
				})
				.remap({
					from: key(c.next),
					to:   key('f', 'command')
				})
			},
			others(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.prev),
					to:   key('left_arrow', 'option')
				})
				.remap({
					from: key(c.next),
					to:   key('right_arrow', 'option')
				})
			}
		},

		'line start/end': {
			terminal(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.start),
					to:   key('home')
				})
				.remap({
					from: key(c.end),
					to:   key('end')
				})
			},
			sonicpi(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.start),
					to:   key('a', 'control')
				})
				.remap({
					from: key(c.end),
					to:   key('e', 'control')
				})
			},
			others(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.start),
					to:   key('left_arrow', 'command')
				})
				.remap({
					from: key(c.end),
					to:   key('right_arrow', 'command')
				})
			}
		},

		'select'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.up),
				to:   key('up_arrow', 'shift')
			})
			.remap({
				from: key(c.down),
				to:   key('down_arrow', 'shift')
			})
			.remap({
				from: key(c.left),
				to:   key('left_arrow', 'shift')
			})
			.remap({
				from: key(c.right),
				to:   key('right_arrow', 'shift')
			})
		},

		'indent/outdent'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.indent),
				to:   key('tab')
			})
			.remap({
				from: key(c.outdent),
				to:   key('tab', 'shift')
			})
		},

		'backspace/delete'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.bs),
				to:   key('delete_or_backspace')
			})
			.remap({
				from: key(c.del),
				to:   key('delete_or_backspace', 'fn')
			})
		},

		'edit'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.undo),
				to:   key('z', 'command')
			})
			.remap({
				from: key(c.cut),
				to:   key('x', 'command')
			})
			.remap({
				from: key(c.copy),
				to:   key('c', 'command')
			})
			.remap({
				from: key(c.paste),
				to:   key('v', 'command')
			})
		},

		'delete line': {
			atom(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('k', ['control', 'shift'])
				})
			},
			vscode(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('k', ['command', 'shift'])
				})
			},
			eclipse(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('d', 'command')
				})
			},
		},

		'insert line': {
			atom(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('return_or_enter', 'command')
				})
			},
			vscode(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('return_or_enter', 'command')
				})
			},
			eclipse(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.key),
					to:   key('return_or_enter', 'shift')
				})
			},
		},

		'move line': {
			atom(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.up),
					to:   key('up_arrow', ['command', 'control'])
				})
				.remap({
					from: key(c.down),
					to:   key('down_arrow', ['command', 'control'])
				})
			},
			vscode(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.up),
					to:   key('up_arrow', 'option')
				})
				.remap({
					from: key(c.down),
					to:   key('down_arrow', 'option')
				})
			},
			eclipse(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.up),
					to:   key('up_arrow', 'option')
				})
				.remap({
					from: key(c.down),
					to:   key('down_arrow', 'option')
				})
			},
			sonicpi(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.up),
					to:   key('p', ['command', 'control'])
				})
				.remap({
					from: key(c.down),
					to:   key('n', ['command', 'control'])
				})
			},
		},

		'left/right tab': {
			vscode(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.left),
					to:   key('left_arrow', ['command', 'option'])
				})
				.remap({
					from: key(c.right),
					to:   key('right_arrow', ['command', 'option'])
				})
			},
			eclipse(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.left),
					to:   key('page_up', 'control')
				})
				.remap({
					from: key(c.right),
					to:   key('page_down', 'control')
				})
			},
			others(c, r) {
				r.cond(modding)
				.remap({
					from: key(c.left),
					to:   key('tab', ['control', 'shift'])
				})
				.remap({
					from: key(c.right),
					to:   key('tab', 'control')
				})
			},
		},

		'close/open tab'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.close),
				to:   key('w', 'command')
			})
			.remap({
				from: key(c.open),
				to:   key('t', 'command')
			})
		},

		'numpad'(c, r) {
			r.cond(modding)
			.remap({
				from: key(c.num0, c.trigger),
				to:   key('keypad_0')
			})
			.remap({
				from: key(c.num1, c.trigger),
				to:   key('keypad_1')
			})
			.remap({
				from: key(c.num2, c.trigger),
				to:   key('keypad_2')
			})
			.remap({
				from: key(c.num3, c.trigger),
				to:   key('keypad_3')
			})
			.remap({
				from: key(c.num4, c.trigger),
				to:   key('keypad_4')
			})
			.remap({
				from: key(c.num5, c.trigger),
				to:   key('keypad_5')
			})
			.remap({
				from: key(c.num6, c.trigger),
				to:   key('keypad_6')
			})
			.remap({
				from: key(c.num7, c.trigger),
				to:   key('keypad_7')
			})
			.remap({
				from: key(c.num8, c.trigger),
				to:   key('keypad_8')
			})
			.remap({
				from: key(c.num9, c.trigger),
				to:   key('keypad_9')
			})
		},

		'remap capslock'(c, r) {
			r.remap({
				from:        key('caps_lock', any),
				to:          key(c.to),
				to_if_alone: key(c.alone)
			})
		},

		'remap l-shift'(c, r) {
			r.remap({
				from:        key('left_shift', any),
				to:          key(c.to),
				to_if_alone: key(c.alone)
			})
		},

		'remap r-shift'(c, r) {
			r.remap({
				from:        key('right_shift', any),
				to:          key(c.to),
				to_if_alone: key(c.alone)
			})
		},

		'custom'(c, r) {
			if (!c.rules.length) return;
			r.cond(modding);
			for (let {from, to, alone} of c.rules) {
				let map = {
					from: key(from),
					to:   key(to)
				};
				if (alone) map.to_if_alone = key(alone);
				r.remap(map);
			}
		},

	};

	// ---- PARSE RULES ---- //

	function label(key) {
		if (Array.isArray(key)) return key.map(label).join(',');
		key = '' + key;
		if (key in config.keyLabels) return config.keyLabels[key];
		return key.split('_').map(I => I.charAt(0).toUpperCase() + I.slice(1)).join(' ');
	}

	let ruleSet = new RuleSet('KeyComfort');
	let apps = config.apps;
	let vim = config['vim-like'];

	for (let i in rules) {

		// rule config
		let rc = config.rules[i];
		if (!rc) continue;
		if (!rc.enable) continue; // rule disabled

		// overwrite conf with vim-like mappings
		if (rc.vim && vim) rc = merge(rc, rc.vim);

		// format rule description
		let desc = rc.desc.replaceAll('<modifier>', label(modifier));
		for (let i in rc) desc = desc.replaceAll(`[${i}]`, label(rc[i]));

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

	let result = ruleSet.toJSON();

	if (opts.print) log(JSON.stringify(result, null, 2));
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

