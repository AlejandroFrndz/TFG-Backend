#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"


t_args_DESCR="Test CRF MWE tagger"
t_args_parse "$@"

t_testdir_configure


########################################


annotate() {
    local args="$1"
    local name_input="$2"
    local name_output="$3"
    local command="$4"
    
    local txt_out="$t_OUTDIR/${name_output}.dimsum"
    local txt_ref="$t_REFDIR/${name_output}.dimsum"

    t_run "$t_BIN/$command -v $args $name_input > $txt_out"
    t_compare_with_ref "${name_output}.txt"
}


t_testname "Annotate candidates with NgramMatch detection"
annotate '' "NgramMatch" "NgramMatch"

t_testname "Annotate gappy candidates (up to 3 gaps)"
annotate '-g 3' "NgramMatch" "Gapped3NgramMatch"

t_testname "Annotate candidates from Source information"
annotate '-S' "Source" "FromSource"
