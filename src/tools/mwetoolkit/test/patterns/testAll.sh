#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"


t_args_DESCR="Test MWE patterns"
t_args_parse "$@"

t_testdir_configure

########################################
# Tests using candidates.py

function test_candidates {
    local corpustype="$1"; shift
    local patterntype="$1"; shift
    local candoptions="$1"; shift    
    local ext=${1:-""};     

    t_testname "Test candidates ${patterntype} ${corpustype} ${ext}"
    t_run "$t_BIN/candidates.py -v ${candoptions} -p $t_LOCAL_INPUT/pattern-${patterntype}.xml $t_LOCAL_INPUT/corpus-${corpustype}.moses >$t_OUTDIR/candidates-${patterntype}${ext}-${corpustype}.xml"
    t_compare_with_ref "candidates-${patterntype}${ext}-${corpustype}.xml"
}

########################################
# Tests using grep.py

function test_grep {
    local corpustype="$1"; shift
    local patterntype="$1"; shift
  
    t_testname "Test grep ${patterntype} ${corpustype}"
    t_run "$t_BIN/grep.py -p $t_LOCAL_INPUT/pattern-${patterntype}.xml --to=XML $t_LOCAL_INPUT/corpus-${corpustype}.moses >$t_OUTDIR/grepped-${patterntype}-${corpustype}.xml"
    t_compare_with_ref "grepped-${patterntype}-${corpustype}.xml"
}
########################################

# Generic tests
for corpustype in french artificial; do
    for patterntype in singleword empty ignore backw; do
        test_candidates ${corpustype} ${patterntype} "-f -S" 
    done
    test_candidates ${corpustype} singleword "-s -S -f" surface
    test_candidates ${corpustype} id "--id-order=p3:p2:p1 -S"
    test_candidates ${corpustype} idword "--id-order=p3:p2:p1 -S"    
done

# Specific for french corpus
corpustype=french
test_candidates ${corpustype} singleword "-g -S -f" nopos
test_candidates ${corpustype} backwpos "-f -S"
test_candidates ${corpustype} wildcardend "-f -S"
test_candidates ${corpustype} wildcardbegin "-f -S"
test_candidates ${corpustype} negationfrench "-f -S"
test_candidates ${corpustype} eithershort "-f -S"
test_candidates ${corpustype} eitherlong "-f -S"
test_candidates ${corpustype} nounphrase "-f -S -d All"

# Specific for 1sentence corpus
corpustype=1sentence
test_candidates ${corpustype} foresyndep "-f -S" 
test_grep ${corpustype} foresyndep 
test_candidates ${corpustype} backsyndep "-f -S" 
test_grep ${corpustype} backsyndep 

# Specific for artificial corpus
corpustype=artificial
test_candidates ${corpustype} ngram "-d Longest -N -S" dist-longest-noover    
test_candidates ${corpustype} foresyndep "-f -S"
test_grep ${corpustype} foresyndep
test_candidates ${corpustype} backsyndep "-f -S"
test_grep ${corpustype} backsyndep
test_candidates ${corpustype} negationartificial "-f -S"
test_candidates ${corpustype} repeat "-d Longest -g -s"
test_candidates ${corpustype} repeat "-d Longest -g -s -N" noover
test_candidates ${corpustype} repeatplus "-d Shortest -S"
test_candidates ${corpustype} repeatplus "-d Longest -g -s" dist-longest
test_candidates ${corpustype} repeatopt "-d All -S"    
test_candidates ${corpustype} repeatn "-d Shortest -S" dist-shortest
test_candidates ${corpustype} repeatn "-d Longest -S" dist-longest
test_candidates ${corpustype} repeatn "-d All -S" dist-all
test_candidates ${corpustype} repeatignore "-f -S"
test_candidates ${corpustype} repeatignore "-f -S --id-order=w2:w1" idorder

