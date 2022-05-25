#! /usr/bin/env python3
# -*- coding:UTF-8 -*-


# XXX TODO FIXME this code is a mess... I initially started using an NgramTree for
# lemmatype flexibility, but there was some bug and I switched to lemma+pos...



################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# feat_annotatedness.py is part of mwetoolkit
#
# mwetoolkit is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# mwetoolkit is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with mwetoolkit.  If not, see <http://www.gnu.org/licenses/>.
#
################################################################################
"""
This script adds an `annotatedness` feature that calculates how often
each candidate is annotated in given corpus.

For more information, call the script with no parameter and read the
usage instructions.
"""


import collections
import sys

import annotate_mwe
from libs.base import feature
from libs.base import ngramtree
from libs import util
from libs import filetype
from libs.base.meta import Meta
from libs.base.meta_feat import MetaFeat




################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} -c <corpus-file> OPTIONS <candidates>
Read a MWE lexicon and a MWE-annotated corpus file.
Output MWE lexicon with an "annotatedness" score.

-c <corpus-file> OR --corpus <corpus-file>
    The annotated corpus, in one of the filetype
    formats accepted by the `--corpus-from` switch.

The <candidates> input file must be in one of the filetype
formats accepted by the `--candidates-from` switch.
    

OPTIONS may be:

--candidates-from <candidates-filetype>
    Force reading candidates from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--corpus-from <corpus-filetype>
    Force reading corpus from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--to <candidates-filetype>
    Output candidates in given filetype format
    (by default, outputs in same format as input):
    {descriptions.output[candidates]}

--gaps <num>
    Use up to `num` gaps.

--filter <threshold>
    Filter below given threshold of annotatedness (in [0..1]).

--keep-unseen
    If --filter is required, keep entries that have not been seen.

{common_options}
"""
filetype_corpus_ext = None
filetype_candidates_ext = None
output_filetype_ext = "XML"

n_gaps = 0
filter_below = 0
detector = None
the_candidates = None
ngram_tree_root = None
corpus_fnames = []
lemmapos_occurrences_counter = collections.Counter()
lemmapos_annotations_counter = collections.Counter()
keep_unseen = False

################################################################################


class AnnotatorHandler(filetype.ChainedInputHandler):
    r"""An InputHandler that prints the input with annotated MWEs."""
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext, category="candidates")
        self.chain.before_file(fileobj, ctxinfo)

    def handle_sentence(self, sentence, ctxinfo):
        """For each sentence in the corpus, update global MWE counters."""
        ASFN = ngram_tree_root.add_subtree_for_ngram
        for mweoccur in detector.detect(ctxinfo, sentence):
            candidate = tuple((sentence[i].lemma, sentence[i].pos) for i in mweoccur.indexes)
            lemmapos_occurrences_counter[candidate] += 1
        for mweoccur in sentence.mweoccurs:
            candidate = tuple((sentence[i].lemma, sentence[i].pos) for i in mweoccur.indexes)
            lemmapos_annotations_counter[candidate] += 1


    def finish(self, fileobj):
        meta = Meta(None, None, None)
        meta.add_meta_feat(MetaFeat("annotatedness", "real"))
        self.chain.handle_meta(meta, None)

        for cand in the_candidates:
            ngram = tuple(((w.lemma), (w.pos)) for w in cand)
            annot = lemmapos_annotations_counter[ngram]
            total = lemmapos_occurrences_counter.get(ngram, float('inf'))
            if annot/total >= filter_below or (total==float('inf') and keep_unseen):
                cand.add_feat(feature.Feature("annotatedness", annot/total))
                self.chain.handle(cand, cand.ctxinfo)
        super(AnnotatorHandler, self).finish(fileobj)


################################################################################


class AbstractDetector(object):
    r"""Base MWE candidates detector.
    
    Constructor Arguments:
    @param candidate_info An instance of CandidateInfo.
    @param n_gaps Number of gaps to allow inside detected MWEs.
    Subclasses are NOT required to honor `n_gaps`.
    """
    def __init__(self, candidate_info, n_gaps):
        self.candidate_info = candidate_info
        self.n_gaps = n_gaps

    def detect(self, ctxinfo, sentence):
        r"""Yield MWEOccurrence objects for this sentence."""
        raise NotImplementedError


class SourceDetector(AbstractDetector):
    r"""MWE candidates detector that uses information
    from the <sources> tag in the candidates file to
    annotate the original corpus.

    See `AbstractDetector`.
    """
    def __init__(self, candidate_info, n_gaps):
        super(SourceDetector,self).__init__(candidate_info, n_gaps)
        self.info_from_s_id = self.candidate_info.parsed_source_tag()

    def detect(self, ctxinfo, sentence):
        for cand, indexes in self.info_from_s_id[str(sentence.id_number)]:
            yield mweoccur.MWEOccurrence(sentence, cand, indexes)



################################################################################  


class AnnotationCandidateNgramTree(annotate_mwe.CandidateNgramTree):
    r"""An `NgramTree` prefix tree where each node keeps
    a counter of corpus occurrences & annotated-occurrences.
    """
    def __init__(self):
        super(AnnotationCandidateNgramTree, self).__init__()
        self.occurrences_in_corpus = 0
        self.annotations_in_corpus = 0



################################################################################  

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global detector
    global filetype_corpus_ext
    global filetype_candidates_ext
    global output_filetype_ext
    global filter_below
    global n_gaps
    global keep_unseen

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-c", "--corpus"):
            corpus_fnames.append(a)
        elif o == "--corpus-from":
            filetype_corpus_ext = a
        elif o == "--candidates-from":
            filetype_candidates_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o == "--filter-below":
            filter_below = float(a)
        elif o == "--gaps":
            n_gaps = int(a)
        elif o == "--keep-unseen":
            keep_unseen = True
        else:
            raise Exception("Bad arg: " + o)

    if not corpus_fnames:
        ctxinfo.error("No corpus file given!")

        
################################################################################  
# MAIN SCRIPT

longopts = ["corpus-from=", "candidates-from=", "to=",
        "candidates=", "gaps=", "filter-below=", "gaps=", "keep-unseen"]
args = util.read_options("c:", longopts, treat_options, -1, usage_string)


the_candidates = filetype.parse_entities(args, filetype_candidates_ext)
ngram_tree_root = AnnotationCandidateNgramTree()
for candidate in the_candidates:
    ngram_tree_root.add_subtree_for_ngram(candidate.ctxinfo, candidate)

class DeceiveTheDetector(object):
    def ngram_tree(self):
        return ngram_tree_root
detector = annotate_mwe.NgramMatchDetector(DeceiveTheDetector(), n_gaps)

filetype.parse(corpus_fnames, AnnotatorHandler(), filetype_corpus_ext)
