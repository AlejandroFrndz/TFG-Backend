#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# annotate_mwe.py is part of mwetoolkit
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
This script creates an annotated copy of an corpus based on a list
of MWE candidates.  The matching n-gram is required to have a superset
of the properties (lemma, pos-tag...) of the corresponding MWE.

The more general script `grep.py` allows for annotation based on
regex-like patterns.  It is more flexible, but slower and less straightforward.

For more information, call the script with no parameter and read the
usage instructions.
"""


import collections
import sys

from libs.base import mweoccur
from libs.base import ngramtree
from libs import util
from libs import filetype




################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} -c <candidates-file> OPTIONS <corpus>
Takes a corpus and a MWE lexicon and outputs an annotated corpus.

-c <candidates-file> OR --candidates <candidates-file>
    The MWE candidates to annotate, in one of the filetype
    formats accepted by the `--candidates-from` switch.

The <corpus> input file must be in one of the filetype
formats accepted by the `--corpus-from` switch.
    

OPTIONS may be:

--candidates-from <candidates-filetype>
    Force reading candidates from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--corpus-from <corpus-filetype>
    Force reading corpus from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--to <corpus-filetype>
    Output corpus in given filetype format
    (by default, outputs in same format as input):
    {descriptions.output[corpus]}

-d <method> OR --detector <method>
    Choose a method of MWE detection (default: "NgramMatch"):
    * Method "NgramMatch": matches candidate ngrams into input corpus.
    * Method "Source": uses "<sources>" tag from candidates file.

-g <n-gaps> OR --gaps <n-gaps>
    Allow a number of gaps inside the detected MWE.
    (This argument is NOT allowed for the method of detection "Source").

-S OR --source
    Annotate based on the "<sources>" tag from the candidates file.
    Same as passing the parameter "--detection=Source".

--filter
    Only outputs sentences that matched with MWEs.
    (Does not annotate the MWE candidates).
    
--filter-and-annot
    Same as --filter, but also annotates the matched candidates.

{common_options}
"""
detector = None
filetype_corpus_ext = None
filetype_candidates_ext = None
output_filetype_ext = None

action_annotate = True
action_filter = False

################################################################################


class AnnotatorHandler(filetype.ChainedInputHandler):
    r"""An InputHandler that prints the input with annotated MWEs."""
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)
        util.verbose("Annotating corpus with MWEs found in list")

    def handle_sentence(self, sentence, ctxinfo):
        """For each sentence in the corpus, detect MWEs and append
        MWEOccurrence instances to its `mweoccur` attribute.

        @param sentence: A `Sentence` that is being read from the XML file.    
        @param ctxinfo: A dictionary with info regarding `sentence`.
        """
        found_occurrence = False
        for mwe_occurrence in detector.detect(ctxinfo, sentence):
            found_occurrence = True
            if not mwe_occurrence.category :
                mwe_occurrence.category = "Auto"
            if action_annotate:
                sentence.mweoccurs.append(mwe_occurrence)

        if found_occurrence or not action_filter:
            self.chain.handle_sentence(sentence, ctxinfo)


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


class NgramMatchDetector(AbstractDetector):
    r"""MWE candidates detector that detects MWEs
    as n-gram matches inside a corpus.

    This is similar to JMWE's Consecutive class, but:
    -- We build MWEOccurrence objects based on an NgramTree,
    turning that ugly `O(n*m)` algorithm into a `O(n+m)` algorithm,
    and hence attempting to match against only a small fraction of the
    set of candidates for each index of the sentence.
    (Assuming `n = number of words in all sentences`
    and `m = number of MWE candidates`).
    -- We allow annotation based on other information besides lemma.
    For example, we can match "swimming pool(s)" with this MWE:
    <cand> <w surface="swimming"/> <w lemma="pool"/> </cand>

    General idea:
    >>> for word in sentence:
    ...     cur_pmatches.append(NgramPartialMatch(mwe_tree_root))
    ...     cur_pmatches = keep(longer_pmatch \
    ...         for pmatch in current_pmatches
    ...         for longer_pmatch in pmatch.matching(word))
    ...     for pmatch in cur_pmatches:
    ...         pop_and_accept(p.mweoccurs_after_matching(word))

    See `AbstractDetector`.
    """
    def __init__(self, candidate_info, n_gaps):
        super(NgramMatchDetector, self).__init__(candidate_info, n_gaps)
        self.mwe_tree_root = self.candidate_info.ngram_tree()


    def detect(self, ctxinfo, sentence):
        cur_pmatches = []  # similar to JMWE's local var `in_progress`
        mweoccurs = []     # all detected MWEOccurrence's, similar to JMWE's `done`
        for i in range(len(sentence)):
            cur_pmatches.append(ngramtree.NgramPartialMatch(
                    self.mwe_tree_root, sentence, self.n_gaps, ()))

            # Keep only pmatches that can (and did) fill next slot
            cur_pmatches = [sub_pmatch  for pmatch in cur_pmatches
                    for sub_pmatch in pmatch.matching_at(i)]

            # Generate MWEOccurrence instances
            for pmatch in cur_pmatches:
                mweoccurs.extend(pmatch.mweoccurs_after_matching_at(i))

        return mweoccurs




detectors = {
    "Source" : SourceDetector,
    "NgramMatch" : NgramMatchDetector,
}


################################################################################  


class CandidatesHandler(filetype.InputHandler):
    r"""Parse file and populate a CandidateInfo object."""
    def __init__(self):
        self.candidate_info = CandidateInfo()

    def handle_meta(self, meta, ctxinfo):
        pass # Removes warning. This handler is supposed to ignore meta

    def handle_candidate(self, candidate, ctxinfo):
        self.candidate_info.add_candidate(candidate, ctxinfo)


class CandidateInfo(object):
    r"""Object with information about candidates."""
    def __init__(self):
        self._candidates = []

    def add_candidate(self, candidate, ctxinfo):
        r"""Add a candidate to this object."""
        candidate.ctxinfo = ctxinfo
        self._candidates.append(candidate)

    def ngram_tree(self):
        r"""Return an instance of NgramTree."""
        ngram_tree_root = CandidateNgramTree()
        for candidate in self._candidates:
            ngram_tree_root.add_subtree_for_ngram(candidate.ctxinfo, candidate)
        return ngram_tree_root

    def parsed_source_tag(self):
        r"""Return a dict {s_id: [(cand,indexes), ...]}."""
        ret = collections.defaultdict(list)
        for cand in self._candidates:
            for ngram in cand.occurs:
                for source in ngram.sources:
                    sentence_id, indexes = source.split(":")
                    indexes = [int(i)-1 for i in indexes.split(",")]
                    if len(cand) != len(indexes):
                        cand.ctxinfo.warn("Bad value of indexes for cand" \
                                " {candid}: {indexes}", candid=cand.id_number,
                                indexes=indexes)
                    else:
                        ret[sentence_id].append((cand,indexes))
        return ret



class CandidateNgramTree(ngramtree.NgramTree):
    r"""An `NgramTree` prefix tree where each node keeps a list
    of candidates as an extra information.
    """
    def __init__(self):
        super(CandidateNgramTree, self).__init__()
        self.ngrams_finishing_here = []

    def add_subtree_for_ngram(self, ctxinfo, candidate):
        subtree = super(CandidateNgramTree, self) \
                .add_subtree_for_ngram(ctxinfo, candidate)
        subtree.ngrams_finishing_here.append(candidate)
        return subtree



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
    global action_annotate
    global action_filter

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    detector_class = NgramMatchDetector
    candidates_fnames = []
    n_gaps = None

    for o, a in ctxinfo.iter(opts):
        if o in ("-c", "--candidates"):
            candidates_fnames.append(a)
        elif o in ("-d", "--detector"):
            detector_class = detectors.get(a, None)
            if detector_class is None:
                ctxinfo.error("Unkown detector name: `{name}`", name=a)
        elif o in ("-S", "--source"):
            detector_class = SourceDetector
        elif o in ("-g", "--gaps"):
            n_gaps = int(a)
        elif o == "--corpus-from":
            filetype_corpus_ext = a
        elif o == "--candidates-from":
            filetype_candidates_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o == "--filter":
            action_annotate = False
            action_filter = True
        elif o == "--filter-and-annot":            
            action_filter = True            
        else:
            raise Exception("Bad arg: " + o)

    if not candidates_fnames:
        ctxinfo.error("No candidates file given!")
    if detector_class == SourceDetector and n_gaps is not None:
        ctxinfo.error('Bad arguments: method "Source" with "--gaps"')
    c = CandidatesHandler()
    util.verbose("Reading MWE list from candidates file")
    filetype.parse(candidates_fnames,
            c, filetype_candidates_ext)
    util.verbose("MWE list loaded in memory successfully")
    detector = detector_class(c.candidate_info, n_gaps or 0)

        
################################################################################  
# MAIN SCRIPT


if __name__ == "__main__":
    longopts = ["corpus-from=", "candidates-from=", "to=",
            "candidates=", "detector=", "gaps=", "source", "filter", 
            "filter-and-annot"]
    arg = util.read_options("c:d:g:So:", longopts, treat_options, -1, usage_string)
    filetype.parse(arg, AnnotatorHandler(), filetype_corpus_ext)
