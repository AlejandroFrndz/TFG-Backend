#!/bin/bash

# CR 12/12/2016

if [ $# -ne 3 ]; then
  echo -e "Error: Incorrect arguments"
  exit
fi

lang="$1"
userId="$2"
projectId="$3"

UDPIPE="./src/tools/udpipe"
UDPIPEMODELS="${UDPIPE}/models/"
MWETOOLKIT="./src/tools/mwetoolkit/"

dest_folder="./src/scripts/corpus_processed/${userId}/${projectId}"
raw_folder="./src/scripts/corpus_raw/${userId}/${projectId}"

if [ $lang = "EN" ]; then
  model=english-partut-ud-2.5-191206.udpipe
  splitter="en"
elif [ $lang = "FR" ]; then
  model=french-ud-2.0-170801.udpipe
  splitter="fr"
elif [ $lang = "ES" ]; then
  model=spanish-ud-2.0-170801.udpipe
  splitter="es"
else
  echo "Error: language not supported: ${lang}"
  exit
fi

mkdir -p ${dest_folder}/index

echo "> Parsing with model $model"
for f in "${raw_folder}"/*.txt; do
  cat "$f" |
  fromdos |
  iconv -c -f UTF-8 -t UTF-8 |  # check corpus original encoding first
  sed -E 's/\r\n?/\n/g' |
  sed 's/<[^>]*>//g' |
  ./src/scripts/split-sentences.perl -l ${splitter} 
done |
awk '{if(NF > 1)print $0}' | # remove 1-word sentences
${UDPIPE}/udpipe --immediate --tokenize --tag --parse --input=horizontal ${UDPIPEMODELS}/${model} |
grep -v "^[0-9]*-[0-9]*	" | # workaround because mwetoolkit ignores ranges...
awk 'BEGIN{FS="\t";OFS="\t"}{if(NF==10) print $1,$2,$3,$4,$4,$6,$7,$8,$9,$10; else print $0}' | # ... and only uses UPOS, ignoring XPOS
cat > ${dest_folder}/corpus.parsed.conll

echo "> Indexing corpus"

${MWETOOLKIT}/bin/index.py --attributes surface,lemma,pos,syn --from=CONLL -v \
                           -i ${dest_folder}/index/corpus \
                           ${dest_folder}/corpus.parsed.conll


# echo "Creating distributional vectors"

# LEMMATYPE="lemmapos" # "lemma lemmapos"
# WINDOW="8" # "4 8 12"
# DIMENSIONS=400
# NEGSAMPLES=20
# EPOCHS=10
# SUBSAMPLING=1e-3
# MINCOUNT=5
# TOOLS="/home/ceramisch/Work/tools/distr"
# W2VBIN="${TOOLS}/word2vec/word2vec"
# awk '/^[^#]/{printf("%s/%s ",$3,$4)}/^$/{printf("\n")}' "${dest_folder}/corpus.parsed.conll" > "${dest_folder}/corpus.w2v.txt"
# set -o xtrace
# OUTFILE="${dest_folder}/${LEMMATYPE}.w${WINDOW}"
# ${W2VBIN} -train "${dest_folder}/corpus.w2v.txt" -window ${WINDOW} -size ${DIMENSIONS} -hs 0 -negative ${NEGSAMPLES} -iter ${EPOCHS} -min-count ${MINCOUNT} -sample ${SUBSAMPLE} -output "${OUTFILE}.w2v.vec" #  -binary 1
# set +o xtrace
# rm "${dest_folder}/corpus.w2v.txt"
# echo "Distributional vectors created in \"${OUTFILE}.w2v.vec\""
                           
gzip ${dest_folder}/corpus.parsed.conll                          

echo -e "> Corpus indexed. You can now run:\n./search-triples-ex.sh NOUN1 VERB NOUN2 ${lang}_${domain}"

