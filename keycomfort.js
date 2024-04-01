#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

/*!
 * ==== KEYCOMFORT ==== *
 * github.com/amekusa/keycomfort
 * ------------------------------ -
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

const {merge} = require('@amekusa/util.js');

let base = __dirname;
let config = {};
[
	'defaults.yml',
	'mac/defaults.yml',
	'win/defaults.yml',
	'linux/defaults.yml',
	'config.yml',
	'mac/config.yml',
	'win/config.yml',
	'linux/config.yml',

].forEach(file => {
	file = path.join(base, file);
	if (!fs.existsSync(file)) {
		fs.writeFileSync(file, '', 'utf8');
		return;
	};
	try {
		let parsed = yaml.parse(fs.readFileSync(file, 'utf8'));
		if (parsed) config = merge(config, parsed, {mergeArrays: 'replace'});
	} catch (e) {
		console.error(e);
	}
});

let modifier = config.rules.modifier.key;
let apps = config.apps;
let vim = yn(config['vim-like']);

function yn(x) {
	if (typeof x == 'string') {
		if (x.match(/^(?:y|yes)$/i)) return true;
		if (x.match(/^(?:n|no)$/i)) return false;
	}
	return !!x;
}

function label(key) {
	if (Array.isArray(key)) return key.map(label).join(',');
	key = '' + key;
	if (key in config.keyLabels) return config.keyLabels[key];
	return key.split('_').map(I => I.charAt(0).toUpperCase() + I.slice(1)).join(' ');
}


// ---- RULE DEFINITIONS ---- //
let modding = if_var('keycomfort_mod', 1);
let any = {optional: 'any'};
let rules = {

	'modifier'(c, r) {
		r.cond(unless_var('keycomfort_disable_mod', 1))
		.remap({
			from:            key(c.key, any),
			to:              set_var('keycomfort_mod', 1, {lazy: true}),
			to_after_key_up: set_var('keycomfort_mod', 0),
			to_if_alone:     key(c.alone)
		})
		return {
			ahk: ``
		}
	},

	'cancel modifier'(c, r) {
		r.remap({
			from: key(c.key, any),
			to: [
				set_var('keycomfort_disable_mod', 1),
				key(c.key)
			],
			to_after_key_up: set_var('keycomfort_disable_mod', 0)
		})
		return {
			ahk: ``
		}
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
		return {
			ahk: `
			${c.up}::Send, {Up}
			${c.right}::Send, {Right}
			${c.down}::Send, {Down}
			${c.left}::Send, {Left}
			`
		}
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
		return {
			ahk: ``
		}
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
			return {
				ahk: ``
			}
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
			return {
				ahk: ``
			}
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
		let {up, down, left, right} = vim ? c.vim : c;
		r.cond(modding)
		.remap({
			from: key(up),
			to:   key('up_arrow', 'shift')
		})
		.remap({
			from: key(down),
			to:   key('down_arrow', 'shift')
		})
		.remap({
			from: key(left),
			to:   key('left_arrow', 'shift')
		})
		.remap({
			from: key(right),
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
		let {bs, del } = vim ? c.vim : c;
		r.cond(modding)
		.remap({
			from: key(bs),
			to:   key('delete_or_backspace')
		})
		.remap({
			from: key(del),
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
			from: key('caps_lock', any),
			to:   key(c.to),
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


// ---- EXPORT RULES ---- //
let ruleSet = new RuleSet('KeyComfort');
let ahk = '';

for (let i in rules) {
	let rule = rules[i];

	let conf = config.rules[i];
	if (!conf) continue;
	if (!conf.enable) continue;

	let newRule;
	let code;

	// rule description
	let desc = conf.desc.replaceAll('<modifier>', label(modifier));
	let keys = (vim && conf.vim) ? conf.vim : conf;
	for (let i in keys) desc = desc.replaceAll(`[${i}]`, label(keys[i]));

	// non app-specific rule
	if (typeof rule == 'function') {
		newRule = ruleSet.add(desc);
		code = rule(conf, newRule);
		if (code) ahk += code.ahk || '';
		continue;
	}

	// app-specific rule
	let enabled = []; // enabled apps
	for (let app in rule) {
		if (app == 'others') continue;
		if (!conf.apps[app]) continue; // disabled
		if (!apps[app]) continue; // invalid app
		enabled = enabled.concat(apps[app]);
		newRule = ruleSet.add(desc + ` (${app})`);
		newRule.cond(if_app(...apps[app]));
		code = rule[app](conf, newRule);
		if (code) ahk += code.ahk || '';
	}
	if (conf.apps.others) {
		newRule = ruleSet.add(desc);
		if (enabled.length) newRule.cond(unless_app(...enabled));
		code = rule.others(conf, newRule);
		if (code) ahk += code.ahk || '';
	}
}

let tasks = [];
tasks.push(new Promise((done, fail) => {
	let data = ruleSet.toJSON();
	fs.writeFile(
		path.join(base, 'mac/keycomfort.json'),
		JSON.stringify(data, null, 2),
		'utf8',
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
