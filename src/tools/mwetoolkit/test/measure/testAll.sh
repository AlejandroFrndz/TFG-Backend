#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"


t_args_DESCR="Test MWE annotation measures"
t_args_parse "$@"

t_testdir_configure


########################################


t_testname "Measure using ExactMatch"
t_run "$t_BIN/measure.py -e ExactMatch -r $t_LOCAL_INPUT/reference.xml $t_LOCAL_INPUT/prediction.xml >$t_OUTDIR/ExactMatch.txt"
t_compare_with_ref "ExactMatch.txt"

t_testname "Measure using LinkBased"
t_run "$t_BIN/measure.py -e LinkBased -r $t_LOCAL_INPUT/reference.xml $t_LOCAL_INPUT/prediction.xml >$t_OUTDIR/LinkBased.txt"
t_compare_with_ref "LinkBased.txt"
