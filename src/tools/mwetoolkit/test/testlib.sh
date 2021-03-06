#! /bin/bash

set -o nounset    # Using "$UNDEF" var raises error
set -o errexit    # Exit on error, do not continue quietly
exec </dev/null   # Don't hang if a script tries to read from stdin
export LC_ALL=C   # Use a unified locale (otherwise our `diff`s will break)
export IFS=$'\n'  # Do not split variables on " " automatically (only on "\n")

export PYTHONIOENCODING=UTF8  # Behave decently even though LC_ALL=C

# Avoid e.g. outputting timestamps (breaks our `diff`)
export MWETOOLKIT_DETERMINISTIC_MODE=""

# Path to mwetoolkit root
t_TOOLKIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."; pwd)"
# Path to mwetoolkit binary dir
t_BIN="$t_TOOLKIT/bin"
# Path to input data shared among all tests
t_INPUT="$t_TOOLKIT/test/inputs"

# Path to python3 or pypy3, or "" to run python scripts directly
t_PYTHON3="${t_PYTHON3:-}"  # (default="")

# Number of diff lines to display on `t_compare`
t_COMPARE_DIFF_LENGTH="${t_COMPARE_DIFF_LENGTH:-25}"
# Whether to continue on error (an executable string!)
t_STOP_ON_ERROR="${t_STOP_ON_ERROR:-true}"

# Limit number of tests to run
t_RUN_N_TESTS="${t_RUN_N_TESTS:-999999}"


##################################################

# Path to the sourcing script (not testlib.sh itself!)
if ! test "${t_HERE+set}"; then
    t_HERE="${HERE:-"${BASH_SOURCE[${#BASH_SOURCE[@]} - 1]}"}"
fi

# Path to the toplevel testAll.sh in execution
if ! test "${t_TOPLEVEL_TESTALL+set}"; then
    export t_TOPLEVEL_TESTALL="$0"
fi

# Temporary directory, used mostly by auxiliary functions:
if ! test "${t_TMP+set}"; then
    t_TMP="${TMP:-/tmp}/testlib.$(id -u)"
    mkdir -p "$t_TMP"
fi

# Path to the speedup logging file (can be "" to disable logging)
if ! test "${t_SPEEDUP_LOGFILE+set}"; then
    mkdir -p "$t_TMP/speedup_logs"
    export t_SPEEDUP_LOGFILE="$t_TMP/speedup_logs/$(date +'%FT%R:%S.%N')"
    echo "Logfile: $t_SPEEDUP_LOGFILE" >&2
fi


# t_testdir_configure
# Setup test directory with `output` directory
# and associated environment variables.
t_testdir_configure() {
    # Path to local (non-shared) input files:
    if ! test "${t_LOCAL_INPUT+set}"; then
        t_LOCAL_INPUT="$t_HERE/local-input"
    fi

    # Path to output files:
    if ! test "${t_OUTDIR+set}"; then
        t_OUTDIR="$t_HERE/output"
        rm -rf "$t_OUTDIR"
        mkdir -p "$t_OUTDIR"
    fi

    # Path to reference output files:
    if ! test "${t_REFDIR+set}"; then
        t_REFDIR="$t_HERE/reference-output"
    fi
}


# t_load_recursive
# Find all subdirectories with a `testAll.sh`
# and run those associated tests.
t_load_recursive() {
    for subdir in "$(dirname "$0")"/*; do
        if test -f "$subdir/testAll.sh"; then
            local name="$(basename "$subdir")"
            t_echo_bold_rgb 4 $'\n===========================>'
            t_echo_bold_rgb 4 "Entering $subdir"
            t_echo_bold_rgb 4 $'===========================>\n'
            "$subdir/testAll.sh"
            t_echo_bold_rgb 4 $'\n<==========================='
            t_echo_bold_rgb 4 "Leaving $subdir"
            t_echo_bold_rgb 4 $'<==========================='
        fi
    done
}


##################################################

# t_echo_bold <txt>
# Print $txt in bold.
t_echo_bold() { printf "\e[1m%s\e[0m\n" "$1"; }

# t_echo_rgb <rgb> <txt>
# Print $txt in colors (0 <= $rgb <= 7; r=1,g=2,b=4).
t_echo_rgb() { printf "\e[$((30+$1))m%s\e[0m\n" "$2"; }

# t_echo_bold_rgb <rgb> <txt>
# Print $txt in bold and in colors (See `t_echo_rgb`).
t_echo_bold_rgb() { t_echo_bold "$(t_echo_rgb "$@")"; }


# t_warn <message>
# Print "WARNING: $message"
t_warn() { t_echo_bold_rgb 1 "WARNING: $1" >&2; }

# t_error <message>
# Print "ERROR: $message"
t_error() {
    t_echo_bold_rgb 1 "ERROR: $1" >&2
    if $t_STOP_ON_ERROR; then
        _t_on_exit TESTLIB
        return 50
    fi
    return 0
}


##################################################

# If set, this is a description such as "Run the FooBar test"
t_args_DESCR=

# t_args_parse "$@"
# Parse command-line arguments
t_args_parse() {
    if test "$#" -eq 1 && test "$1" = "-h"; then
        _t_usage_exit 0
    fi
    if test "$#" -ne 0; then
        t_echo_bold_rgb 1 "Unknown option: $1"
        _t_usage_exit 1
    fi
}

_t_usage_exit() { {
    echo "Usage: $(basename "$0") [-h]"
    test "${t_args_DESCR}" && echo "$t_args_DESCR"
    exit "$1"
} 1>&2;
}


##################################################

# t_testname <test_name>
# Print "num: test_name" in bold
t_testname() {
    _THIS_TEST_NAME="$1"
    _THIS_TEST_NUM="$((${_THIS_TEST_NUM:-}+1))"
    test "$_THIS_TEST_NUM" -ne 1  && echo ""

    if test "$_THIS_TEST_NUM" -gt "$t_RUN_N_TESTS"; then
        t_echo_bold "[Stopping after $t_RUN_N_TESTS tests]"
        exit 0
    fi
    t_echo_bold "$_THIS_TEST_NUM: $_THIS_TEST_NAME"
}


# t_run <command_and_args>
# Run command with given args.
# Also echoes the command on screen.
# Respects env-var `t_NO_ECHO_CMD`.
t_run() {
    local cmdargs="$1"; shift
    test "$#" -eq 0  # Assert no extra args

    if test "$t_PYTHON3" != "" && echo "$cmdargs" | grep -E "^\\S*\\.py" >/dev/null; then
            cmdargs="$t_PYTHON3 $cmdargs"
    fi
    if ! test "${t_NO_ECHO_CMD+set}"; then
        t_echo_rgb 3 "$cmdargs"
    fi

    printf "=> %q\n" "$cmdargs" >>"$t_SPEEDUP_LOGFILE"

    local errcode=0
    TIMEFORMAT="%Uuser %Ssystem 0:%3Relapsed %P%%CPU bash_builtin"
    time ({ eval "$cmdargs"; } >/dev/null 2>&3) 3>&2 2>>"$t_SPEEDUP_LOGFILE" || errcode="$?"

    if test "$errcode" -ne 0 && $t_STOP_ON_ERROR; then
        exit 70
    fi
    return 0
}


# t_diff [diff_args...] <text_a> <text_b>
# Diff between text_a and text_b.
# Uses wdiff if available.
t_diff() {
    if hash "wdiff" 2>/dev/null; then
        diff -u "$@" | wdiff -d --terminal -y $'\e[35m' -z $'\e[m'
        test ${PIPESTATUS[0]} -eq 0
    else
        if ! test "${_WARNED_WDIFF+set}"; then
            t_warn "wdiff is not installed; using diff"
            _WARNED_WDIFF=1
        fi
        diff -u "$@"
    fi
}


# t_compare_with_ref <txt>
t_compare_with_ref() {
    t_compare "$t_REFDIR/$1" "$t_OUTDIR/$1" "Comparing \"$1\" vs reference"
}

# t_compare <txt_ref> <txt_in> [description]
# Compare `txt_in` to reference `txt_ref` and output differences.
# If a `description` is given, prepend it to OK/ERROR output.
t_compare() {
    local errcode=0
    local txt_ref="$1"; shift
    local txt_in="$1"; shift
    local description="${1:-"Comparing \"${txt_ref}\" vs \"${txt_in}\""}"
    echo -n "$(t_echo_rgb 0 "${description}... ")"

    if ! test -f "$txt_ref"; then
        t_echo_bold_rgb 1 "ERROR!"
        t_echo_bold_rgb 1 "??? Not found: $txt_ref"
        $t_STOP_ON_ERROR && exit 60

    elif ! test -f "$txt_in"; then
        t_echo_bold_rgb 1 "ERROR!"
        t_echo_bold_rgb 1 "??? Not found: $txt_in"
        $t_STOP_ON_ERROR && exit 61

    else
        t_diff "$txt_ref" "$txt_in" >"$t_TMP/last_diff" || errcode="$?"

        if test "$errcode" -ne 0; then
            t_echo_bold_rgb 1 "FAILED! Beginning of diff:"
            # We add a size restriction, as lines may have much more than
            # $COLUMNS and end up looking much bigger than $t_COMPARE_DIFF_LENGTH
            # on the terminal.  Also note that "head -c" will count the number
            # of bytes, which includes formatting stuff like "^[[1m;" and
            # is not necessarily a good estimator of the number of
            # (mostly utf-8) characters...
            local byterestrict="$((${COLUMNS:-80} * t_COMPARE_DIFF_LENGTH))"
            head -c "$byterestrict" "$t_TMP/last_diff" >"$t_TMP/byterestr_last_diff"
            if ! cmp --silent "$t_TMP/last_diff" "$t_TMP/byterestr_last_diff"; then
                echo -e '\e[0m[...]' >>"$t_TMP/byterestr_last_diff"
            fi
            t_echo_rgb 5 ==============================================
            head -n "$t_COMPARE_DIFF_LENGTH" "$t_TMP/byterestr_last_diff"

            $t_STOP_ON_ERROR && exit "$errcode"
            t_backtrace  # Not printed by _t_on_exit, in this case
        else
            t_echo_bold_rgb 2 "OK."
        fi
    fi
    return 0
}


# t_backtrace [skip_n]
# Print a stack backtrace of calling functions.
# Skip the most recent `skip_n` frames (default: skip_n=0).
t_backtrace() {
    local skip_n="${1:-0}"
    t_echo_rgb 1 ==============================================
    t_echo_rgb 1 "Shell backtrace (most recent first):"
    if test "${BASH_VERSION+set}"; then
        local n="${#BASH_LINENO[@]}"
        for i in `seq ${skip_n} $((n - 2))`; do
            t_echo_rgb 1 "  In ${FUNCNAME[$((i+1))]} at ${BASH_SOURCE[$((i+1))]}:${BASH_LINENO[$i]}"
        done
    else
        echo "  Unable to get a backtrace (shell=$SHELL)"
        echo "  Use 'bash' for better output."
    fi
}



# _t_on_exit <skip_n> <err_kind>
# Function that is called when exiting
# (after successful execution or on error).
_t_on_exit() {
    ERRCODE="$?"
    test "$ERRCODE" -ne 0 && t_backtrace "$1"
    if test "$t_TOPLEVEL_TESTALL" = "$0"; then
        "$t_TOOLKIT/test/speedupCheck.py" --testlib
    fi
    return "$ERRCODE"
}

trap '_t_on_exit 1 ERR' ERR

# TODO find out why bash corrupts BASH_LINENO[0]
# inside `_t_on_exit` when called for SIGINT/EXIT
# (may be a bash bug)
trap '_t_on_exit 2 EXIT' EXIT
