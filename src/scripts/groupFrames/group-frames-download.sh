#!/bin/bash

if [ $# -ne 2 ]; then
  echo -e "Incorrect arguments"
  exit
fi

projectId="$1"
isProd="$2"

if [ "$isProd" == "false" ]; then
  inFile="./src/scripts/groupFrames/${projectId}/tags.tsv"
  outFile="./src/scripts/groupFrames/${projectId}/download/results.txt"
  groupFrames="./src/scripts/groupFrames/group-frames.py"
else
  inFile="./dist/src/scripts/groupFrames/${projectId}/tags.tsv"
  outFile="./dist/src/scripts/groupFrames/${projectId}/download/results.txt"
  groupFrames="./dist/src/scripts/groupFrames/group-frames.py"
fi

${groupFrames} txt ${inFile} > ${outFile}