#!/bin/bash
set -o errexit  # Exit on error, do not continue quietly
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/testlib.sh"

t_args_DESCR="Run all tests"
t_args_parse "$@"
t_load_recursive
