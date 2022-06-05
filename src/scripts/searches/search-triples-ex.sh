#!/bin/bash

if [ $# -ne 6 -a $# -ne 7 ]; then
  echo -e "Incorrect parameters"
  exit
fi

noun1="$1"
verb="$2"
noun2="$3"
projectId="$4"
searchId="$5"
isProd="$6"
synt="$7"

nominalPOS="NOUN" # THANKS Universal dependencies!
verbalPOS="VERB"  # THANKS Universal dependencies!
adverbialPOS="ADV"  # THANKS Universal dependencies!

########################################################################
# Transforms a list of terms in a file (passed as first argument) into
# a regexp containing the alternative between all these terms. The file
# must contain the terms one per line, lemmatised, and words are 
# separated by spaces
function list2regexp() {
  fromdos $1
  cat $1 |
  #sort | uniq | # remove duplicates => THERE IS A BUG IN MWETOOLKIT, ORDER MATTERS!
  sed 's/ \+/ /g' | # remove double spaces
  sed -e '/^ *$/d' -e 's/^ *//g' -e 's/ *$//g' | # remove blank lines, trailing spaces
  sed 's/.*/(&)/g' | # add surrounding parentheses to each line
  tr '\n' '|' | # join all lines by alternative |
  sed -e 's/^/(/g' -e 's/|$/)/g'
}

########################################################################
# Deal with options ANY (underspecified noun/verb) or LIST (list of 
# compound terms taken from a list, no POS filter)
########################################################################
listn1="NONE"
listverb="NONE"
listn2="NONE"
if [ $noun1 == "ANY" ]; then
  patn1="[pos~/${nominalPOS}/]"
elif [ -f "${noun1}" ]; then
  if [ "${synt}" == "synt" ]; then
    echo "ERROR: Using lists is incompatible with \"synt\""
    exit -1
  fi
  listn1="${noun1}"
  echo "Noun1 taken from list '${listn1}'"  
  patn1=`list2regexp ${noun1}`
else
  patn1="[lemma~/${noun1}/ pos~/${nominalPOS}/]"
fi

if [ $verb == "ANY" ]; then
  patv="[pos~/${verbalPOS}/]"
elif [ -f "${verb}" ]; then
  if [ "${synt}" == "synt" ]; then
    echo "ERROR: Using lists is incompatible with \"synt\""
    exit -1
  fi
  listverb="${verb}"
  echo "Verb taken from list '${listverb}'"
  patv=`list2regexp ${listverb}`
else
  patv="[lemma~/${verb}/ pos~/${verbalPOS}/]"
fi

# Nominal POS includes ADV for synt searches because of frequent POS tagging errors
if [ "${synt}" == "synt" ]; then
  n2pos="pos~/(${nominalPOS}|${adverbialPOS})/"
else
  n2pos="pos~/${nominalPOS}/"
fi

if [ $noun2 == "ANY" ]; then
  patn2="[${n2pos}]"
elif [ -f "${noun2}" ]; then
  if [ "${synt}" == "synt" ]; then
    echo "ERROR: Using lists is incompatible with \"synt\""
    exit -1
  fi
  listn2="${noun2}"
  echo "Noun 2 taken from list '${listn2}'"
  patn2=`list2regexp ${listn2}`
else
  patn2="[lemma~/${noun2}/ ${n2pos}]"
fi

if [ "${synt}" == "synt" ]; then
  query="[${patn1:1:${#patn1}-2} syndep=\"nsubj:v\"] []{repeat=* ignore=true} ${patv}{id=v} []{repeat=* ignore=true} [${patn2:1:${#patn2}-2} syndep~/(obj|iobj|advmod|advcl):v/]"
  echo "Using syntactic relations - incompatible with LIST"
elif [ "${synt}" == "" ]; then
  query="${patn1} []{repeat={0,3} ignore=true} ${patv} []{repeat={0,3} ignore=true} ${patn2}"  
  echo "NOT using syntactic relations"
else
  echo -e "The 6th argument should be \"synt\" or empty. You typed \"${synt}\"."
  echo -e "I do not know what you mean. Please, check the command and try again."
  exit -1
fi

########################################################################
# Interpret corpus folder
########################################################################

if [ "$isProd" == "false" ]; then
  corpus="./src/scripts/searches/${projectId}/processed-corpus/"
else
  corpus="./dist/src/scripts/searches/${projectId}/processed-corpus/"
fi

if [ ! -d "${corpus}/index" ]; then
  if [ -f "${corpus}/index.zip" ]; then
    echo "uncompressing corpus index"
    unzip "${corpus}/index.zip" -d "${corpus}"
    rm "${corpus}/index.zip"
  else
    echo "Corpus index folder \"${corpus}/index\" does not exist!"
    exit -1
  fi
else
  echo "Corpus index exists"  
fi

########################################################################
# Perform the searches
########################################################################

if [ "$isProd" == "false" ]; then
  searchesFolder="./src/scripts/searches"
else
  searchesFolder="./dist/src/scripts/searches"
fi

OUTFOLDER="${searchesFolder}/${projectId}/search-results"
searchPattern="${searchesFolder}/search-pattern-ex.sh"
splitNgram="${searchesFolder}/split_ngram_in_n1_v_n2.py"
mergeCands="${searchesFolder}/merge-cands-examples.py"

mkdir -p $OUTFOLDER

outfile="$OUTFOLDER/$searchId"

${searchPattern} "${query}" ${corpus} ${outfile}.tmp ${isProd}

if [ ! $? = 0 ]; then
  echo -e "Error in query execution, quitting the script without saving the result"
  exit -1  
fi

cat ${outfile}.tmp | 
${splitNgram} ${listn1} ${listverb} ${listn2} |
sed -e 's/ /	/1' | 
sed -e 's/ /	/1' | 
sed -e '1s/ngram/n1	verb	n2/g' |
cat  > ${outfile}.noexamples.tsv

echo "Matching examples and candidates"
${mergeCands} ${outfile}.noexamples.tsv ${outfile}.tmp.examples |
iconv -c -f utf8 -t utf8 | # remove spurious chars
cat > ${outfile}.tsv

rm ${outfile}.tmp ${outfile}.tmp.xml ${outfile}.noexamples.tsv ${outfile}.tmp.examples

echo "Search triples executed successfully"