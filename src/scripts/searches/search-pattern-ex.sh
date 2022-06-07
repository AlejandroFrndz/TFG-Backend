#!/bin/bash

if [ $# -ne 4 ]; then
  echo -e "Incorrect arguments"
  exit
fi

pattern=$1
corpusindex=$2/index/corpus.info
outfile=$3
isProd=$4

if [ "$isProd" == "false" ]; then
  MWETOOLKIT="./src/tools/mwetoolkit/"
else
  MWETOOLKIT="./dist/src/tools/mwetoolkit/"
fi

if [ ! -f ${corpusindex} ]; then
  echo "Corpus file not found. Probably it was not indexed. Try running ./parse-and-index-corpus.sh"
  exit -1
fi

if [ -f "${pattern}" ]; then
  patternopt="-p"
else
  patternopt="-e"
fi

${MWETOOLKIT}/bin/candidates.py -S -v -g -f ${patternopt} "${pattern}" ${corpusindex} |
${MWETOOLKIT}/bin/counter.py -v -g -J -i ${corpusindex} |
tee ${outfile}.xml |
${MWETOOLKIT}/bin/feat_association.py --measures=pmi:dice:t --to=CSV |
tail -n +2 | # Remove first line, it's an internal mwetoolkit header
awk 'NR<2{print $0;next}{print $0| "sort -nr -k9,9 -t \"	\""}' | # Sort in descending t-score order
cat > ${outfile}

echo "Extracting example sentences..."
${MWETOOLKIT}/bin/annotate_mwe.py -v --filter-and-annot -S -c ${outfile}.xml --to TaggedPlainCorpus ${corpusindex} > ${outfile}.examples

total=`wc ${outfile} | awk '{print $1-1}'`

echo "Results sneak peek ;-)"
cut -f 1,2,4,9 ${outfile} | head
echo "..."
echo "Total : ${total} entries"