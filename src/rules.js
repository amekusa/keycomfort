const {
	key,
	click,
	set_var,
	if_var, unless_var,
	if_lang, unless_lang,
} = require('karabinerge');

const modding = if_var('keycomfort_layer', 1);
const any = {optional: 'any'};
const rules = {

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
			from: key(c.backspace),
			to:   key('delete_or_backspace')
		})
		.remap({
			from: key(c.delete),
			to:   key('delete_or_backspace', 'fn')
		})
	},

	'delete word'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.key),
			to:   key('delete_or_backspace', 'option')
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
		.remap({
			from: key(c.slash, c.trigger),
			to:   key('keypad_slash')
		})
		.remap({
			from: key(c.asterisk, c.trigger),
			to:   key('keypad_asterisk')
		})
		.remap({
			from: key(c.hyphen, c.trigger),
			to:   key('keypad_hyphen')
		})
		.remap({
			from: key(c.plus, c.trigger),
			to:   key('keypad_plus')
		})
		.remap({
			from: key(c.enter, c.trigger),
			to:   key('keypad_enter')
		})
		.remap({
			from: key(c.delete, c.trigger),
			to:   key('delete_or_backspace', 'fn')
		})
		.remap({
			from: key(c.backspace, c.trigger),
			to:   key('delete_or_backspace')
		})
	},

	'plus/minus'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.plus),
			to:   key(c.to.plus)
		})
		.remap({
			from: key(c.minus),
			to:   key(c.to.minus)
		})
	},

	'backslash'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'backtick'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'tilde'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'pipe'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'equal'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'enter'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
		})
	},

	'underscore'(c, r) {
		r.cond(modding)
		.remap({
			from: key(c.from),
			to:   key(c.to)
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

	'remap capslock'(c, r) {
		r.remap({
			from:        key('caps_lock', any),
			to:          key(c.to),
			to_if_alone: key(c.alone)
		})
	},

	'remap l-control'(c, r) {
		r.remap({
			from:        key('left_control', any),
			to:          key(c.to),
			to_if_alone: key(c.alone)
		})
	},

	'remap r-control'(c, r) {
		r.remap({
			from:        key('right_control', any),
			to:          key(c.to),
			to_if_alone: key(c.alone)
		})
	},

	'remap l-command'(c, r) {
		r.remap({
			from:        key('left_command', any),
			to:          key(c.to),
			to_if_alone: key(c.alone)
		})
	},

	'remap r-command'(c, r) {
		r.remap({
			from:        key('right_command', any),
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

};

module.exports = rules;

