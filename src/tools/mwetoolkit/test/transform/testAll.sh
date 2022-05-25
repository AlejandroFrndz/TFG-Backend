#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"


t_args_DESCR="Test transform.py"
t_args_parse "$@"

t_testdir_configure
"$t_BIN/head.py" "$t_INPUT/ted500.xml">"$t_OUTDIR/smallTed.xml"


##################################################

t_testname "Bracketing word surfaces"
t_run "$t_BIN/transform.py --to=PlainCorpus --each-word 'w.surface = \"[\"+w.surface+\"]\"' $t_OUTDIR/smallTed.xml >$t_OUTDIR/Bracket.PlainCorpus"
t_compare_with_ref "Bracket.PlainCorpus"

t_testname "Replacing surface by surface/POS-tag"
t_run "$t_BIN/transform.py --to=PlainCorpus --begin 'print(\"BEGIN-STRING\")' --end 'print(\"END-STRING\")'  --each-word 'w.surface = w.surface+\"/\"+w.pos' $t_OUTDIR/smallTed.xml >$t_OUTDIR/SurfaceSlashPOS.PlainCorpus"
t_compare_with_ref "SurfaceSlashPOS.PlainCorpus"
