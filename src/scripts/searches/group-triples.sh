#!/bin/bash

if [ $# -ne 1 ]; then
  echo -e "Incorrect arguments"
  exit
fi

searchResultsFolder="$1/search-results"
OUTFILE="$1/combined-searches.tsv"

for f in "$searchResultsFolder"/*.tsv; do
  cat "$f" |
  LC_ALL=C sed -E 's/\r\n?/\n/g' |
#  iconv -f latin1 -t utf8 |  
  head -n 1 
done | sort | uniq > "$OUTFILE"

if [ ! `wc "$OUTFILE" | awk '{print $1}'` = 1 ]; then
  echo "WARNING: file headers differ!"
  cat "$OUTFILE"
  echo "Keeping only first header"
  LC_ALL=C sed -i '2,$d' "$OUTFILE"  
fi

for f in "$searchResultsFolder"/*.tsv; do
  cat "$f" |
  LC_ALL=C sed -E 's/\r\n?/\n/g' |
#  iconv -f latin1 -t utf8 |
  tail -n +2 "$f"
done | cat >> "$OUTFILE"

cat "$OUTFILE" |
awk 'BEGIN{FS=OFS="\t"; getline; {print $1,$2,"TR1","SC1",$3,"Domain",$4,"TR2","SC2","Frame","Problem",$12,$5,$6,$7,$8,$9,$10,$11}}{print $1,$2,"","",$3,"",$4,"","","","",$12,$5,$6,$7,$8,$9,$10,$11}' > tmp
mv tmp "$OUTFILE"

echo "Group triples executed successfully"