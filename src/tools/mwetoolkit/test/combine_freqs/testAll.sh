#! /bin/bash
HERE="$(cd "$(dirname "$0")" && pwd)"

source "$HERE/../testlib.sh"

t_args_DESCR="Run the combine_freqs test"
t_args_parse "$@"


t_testdir_configure

##################################################

for part in 1 2 3; do
  t_testname "Indexing corpus split corpus-0${part}.moses"
  t_run "$t_BIN/index.py -i $t_OUTDIR/index-0${part} $t_LOCAL_INPUT/corpus-0${part}.moses"
  # No comparison with reference needed here
done

# Uses trick to consecutively add frequencies to candidates in same file: 
# number uncounted candidates as 00 and then always go from i-1 to i
t_testname "Candidate extraction from source corpus"
t_run "$t_BIN/candidates.py -p $t_LOCAL_INPUT/patterns.xml $t_LOCAL_INPUT/corpus-??.moses | $t_BIN/sort.py >$t_OUTDIR/candidates-count-00.xml"
t_compare_with_ref "candidates-count-00.xml"

t_testname "Counting candidates in each split, cumulative"
for part in 1 2 3; do
  prev=$(( $part - 1 )) # previously candidates files with counts
  t_run "$t_BIN/counter.py -v -i $t_OUTDIR/index-0${part}.info $t_OUTDIR/candidates-count-0${prev}.xml > $t_OUTDIR/candidates-count-0${part}.xml"  
done
t_compare_with_ref "candidates-count-03.xml"

t_testname "Counting candidates in web (actually using Google cache)"
  t_run "$t_BIN/head.py -n 200 $t_OUTDIR/candidates-count-03.xml | $t_BIN/counter.py -w --cache-filename=\"$HERE/google_cache.dat\" --max-cache-days=-1 --lang=en > $t_OUTDIR/candidates-count-03w.xml"
  t_compare_with_ref "candidates-count-03w.xml"


t_testname "Combine frequencies from different sources"
t_run "$t_BIN/combine_freqs.py --original \"index-03\" $t_OUTDIR/candidates-count-03w.xml >$t_OUTDIR/candidates-count-join.xml"
t_compare_with_ref "candidates-count-join.xml"








