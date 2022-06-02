#!/usr/bin/env python3

# Detect the fields based on a list of terms

import sys
import re

lists = ([], [], [])
for i in range(3):
  if sys.argv[i+1] != "NONE":
    for line in open(sys.argv[i+1]):
      lists[i].append(line.strip())

print(sys.stdin.readline(),end="") # header

delimbefore = ("^"," "," ")
delimafter = (" "," ","$")

for l in sys.stdin:
  fields = l.strip().split("\t")
  ngram = fields[1]
  for i in range(3):
    for repelemfrom in lists[i]:
      repelemto = re.sub(" ","_", repelemfrom)
      ngram = re.sub(delimbefore[i] + repelemfrom + delimafter[i],
                     (" " if delimbefore[i] == " " else "") + \
                     repelemto + \
                     (" " if delimafter[i] == " " else ""),
                     ngram)  
  fields[1] = ngram
  print("\t".join(fields))