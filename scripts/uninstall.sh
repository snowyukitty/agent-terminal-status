#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -f "$script_dir/install-state.json" ]; then
    config_dir=$(dirname -- "$script_dir")
    exec python3 "$script_dir/manage.py" uninstall --config-dir "$config_dir" "$@"
fi
exec python3 "$script_dir/manage.py" uninstall "$@"
