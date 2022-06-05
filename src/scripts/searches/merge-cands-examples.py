#!/usr/bin/env python3
"""
  Given a candidates file in TSV format and a TaggedPlainCorpus file obtained
  from annotate_mwes.py, matches the candidates with the corresponding example
  sentences, thus adding example sentences as an additonal column of the TSV.
  The examples are formatted in a way that the candidate's words are surrounded
  by brackets for better readabilty.
"""

import sys
import pdb
import re

def beautify(line,mweid):
  """
    Given a sentence in TaggedPlainCorpus format and the mweid we want to focus
    on (there may be several tagged MWEs), generates a version of the sentence
    where, instead of XML tags, the focused MWE has its words surrounded with
    brackets for better readability. Also escapes brackets that may occur in the
    sentence, as well as tab characters.
  """
  # remove \n and escape special characters
  outline = line.strip().replace("\t"," ").replace("[","(").replace("]",")")
  outline = re.sub('<mwepart id="([0-9]*,)?'+mweid+'(,[0-9]*)?">',"[",outline)
  outline = re.sub('\[([^<]*)</mwepart>','[\\1]',outline)
  outline = re.sub('</?mwepart[^>]*>','',outline)
  return outline

candidates_tsv=sys.argv[1]
examples_tagged=sys.argv[2]

examples_dict = {}
# First read the list of example sentences to a dict indexed by MWE id
with open(examples_tagged,errors='ignore') as examples:
  for line in examples:
    for idtuple in re.finditer("<mwepart id=\"([^\"]*)\">",line):
      for idnumber in idtuple.group(1).split(","):
        example_entry = examples_dict.get(idnumber,set([]))
        example_entry.add(beautify(line, idnumber))
        examples_dict[idnumber] = example_entry

# then process the list of candidates, adding examples from the dict built above
with open(candidates_tsv,errors='ignore') as candidates:
  print(candidates.readline().strip()+"\texamples")
  for candidate in candidates:
    cand_id = candidate.split("\t")[0]
    example_sentences = "; ".join(examples_dict[cand_id])
    print(candidate.strip()+"\t"+example_sentences)