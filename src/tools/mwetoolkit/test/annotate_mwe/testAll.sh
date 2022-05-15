#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"


t_args_DESCR="Test MWE annotation"
t_args_parse "$@"

t_testdir_configure


########################################


annotate() {
    local args="$1"
    local name_input="$2"
    local name_output="$3"

    local xml_out="$t_OUTDIR/${name_output}.xml"
    local txt_out="$t_OUTDIR/${name_output}.txt"
    local txt_ref="$t_REFDIR/${name_output}.txt"

    local corpus="$t_LOCAL_INPUT/${name_input}/corpus.xml"
    local candidates="$t_LOCAL_INPUT/${name_input}/candidates.xml"

    t_run "$t_BIN/annotate_mwe.py -v $args --to=TaggedPlainCorpus -c $candidates $corpus >$txt_out"
    t_compare_with_ref "${name_output}.txt"
}


t_testname "Annotate candidates with NgramMatch detection"
annotate '' "NgramMatch" "NgramMatch"

t_testname "Annotate gappy candidates (up to 3 gaps)"
annotate '-g 3' "NgramMatch" "Gapped3NgramMatch"

t_testname "Annotate candidates from Source information"
annotate '-S' "Source" "FromSource"
