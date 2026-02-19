# KEYCOMFORT
[![NPM Version](https://img.shields.io/npm/v/keycomfort?label=npm%20package&color=blue)](https://www.npmjs.com/package/keycomfort)

Comfortable keyboard remaps for those who **NEVER** want to move their hands away from the home row position.
Very opinionated, but also easy to customize with a YAML file.

## Requirements
- macOS
- [Karabiner Elements](https://karabiner-elements.pqrs.org/)

## Installation
There are 2 ways to install Keycomfort: JSON or CLI.

## JSON installation
1. Download the JSON file from [dist](https://github.com/amekusa/keycomfort/tree/master/dist).
Pick either [keycomfort.json](https://github.com/amekusa/keycomfort/blob/master/dist/keycomfort.json) or [keycomfort-vim.json](https://github.com/amekusa/keycomfort/blob/master/dist/keycomfort-vim.json).
The latter is for those who prefer Vim-like mappings.
2. Put the JSON file into `📁 ~/.config/karabiner/assets/complex_modifications`.
3. Open Karabiner's preferences.
4. `Complex modifications` ➔ `Add rule` ➔ `Keycomfort` ➔ `Enable All`.

## CLI installation
If you want to customize the mappings, we recommend using the commandline utility, instead of manually installing JSON.
You can install `keycomfort` CLI via NPM:

```sh
npm i -g keycomfort
```

## CLI Usage
```sh
# Show help
keycomfort help

# Show help for command
keycomfort help [command]

# Create/Edit the config file (~/.config/keycomfort/config.yml)
keycomfort config

# Generate/Apply the keymaps (keycomfort.json)
keycomfort gen
```

See also: [configuration examples](https://github.com/amekusa/keycomfort/tree/master/presets).

## License
MIT © 2025 [Satoshi Soma](https://github.com/amekusa)

