#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"

t_args_DESCR="Run the BinaryIndex test"
t_args_parse "$@"


t_testdir_configure

##################################################

t_testname "Corpus indexing in C or Python"
t_run "$t_BIN/index.py -i $t_OUTDIR/c_corpus $t_LOCAL_INPUT/corpus.xml"

t_testname "Corpus indexing in Python"
t_run "$t_BIN/index.py -o -i $t_OUTDIR/p_corpus $t_LOCAL_INPUT/corpus.xml"

t_testname "Extraction from index"
t_run "$t_BIN/candidates.py -p $t_LOCAL_INPUT/patterns.xml $t_OUTDIR/c_corpus.info >$t_OUTDIR/c_candidates-from-index.xml"

t_testname "Individual word frequency counting in C index"
t_run "$t_BIN/counter.py -v -i $t_OUTDIR/c_corpus.info $t_OUTDIR/c_candidates-from-index.xml >$t_OUTDIR/c_candidates-counted.xml"

t_testname "Individual word frequency counting in Python index"
t_run "$t_BIN/counter.py -v -i $t_OUTDIR/p_corpus.info $t_OUTDIR/c_candidates-from-index.xml >$t_OUTDIR/p_candidates-counted.xml"


##################################################

t_testname "Compare output with reference and with each other"
for filepath in "$t_REFDIR/corpus."{lemma,surface,pos,syn,lemma+pos}.* "$t_REFDIR/corpus.info"; do
    # Compare C with Python output
    t_compare "$t_OUTDIR/p_$(basename "$filepath")" "$t_OUTDIR/c_$(basename "$filepath")"
    # Compare C with Reference output
    t_compare "$t_REFDIR/$(basename "$filepath")" "$t_OUTDIR/c_$(basename "$filepath")"
done
t_compare_with_ref "c_candidates-from-index.xml"
t_compare_with_ref "c_candidates-counted.xml"

#################################################







