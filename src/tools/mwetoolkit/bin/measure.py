#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2018 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos, Manon Scholivet
#
# measure.py is part of mwetoolkit
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
This script implements different token-based MWE identification measures,
which can be used to compare a corpus of predicted MWEs with another reference
corpus, on account of the annotated MWEs.

For more information, call the script with no parameter and read the
usage instructions.
"""


import collections
import sys

from libs import util
from libs.base import measuring
from libs.filetype import parse_entities




################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} -r <reference> OPTIONS <corpus>
Compare annotated corpus vs reference. Output a summary of MWE correctness.

-r <reference> OR --reference <reference>
    A gold-standard corpus with annotated MWE occurrences, in one
    of the filetype formats accepted by the `--reference-from` switch.

The <corpus> input file must be in one of the filetype
formats accepted by the `--corpus-from` switch.

    
OPTIONS may be:

--corpus-from <input-filetype-ext>
    Force reading corpus from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--reference-from <reference-filetype-ext>
    Force reading gold-standard from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

-e <evaluator> OR --evaluator <evaluator>
    The MWE evaluation algorithm.
    * Evaluator "ExactMatch": Binary comparison.
      Either the MWEs match or they do not.
    * Evaluator "LinkBased": Compare subsequent MWE token pairs,
      as in Schneider [2014] at TACL.

--sentence-aligner <aligner>
    The algorithm that will align sentences between reference and prediction.
    * Aligner "Naive": aligns (0, 0), (1, 1) ... (N, N).
      The only currently supported aligner.
      
{common_options}
"""

reference_fname = None
mwe_evaluator = None
corpus_filetype_ext = None
reference_filetype_ext = None


##################################################################


class NaiveSentenceAligner(object):
    """A very simplistic sentence-alignment algorithm.
    Assumes that the number of sentences is the same in
    both reference and in prediction corpus and that
    they appear in the same order.
    """
    def aligned_sentence_lists(self, reference, prediction):
        r"""Yield (multiplier, s_reference, s_prediction) pairs, where:
        -- `multiplier`: a number in [0,1].
        -- `s_reference`: a `Sentence` object.
        -- `s_prediction`: a `Sentence` object.

        @param reference: A list of `Sentence` objects.
        @param prediction: A list of `Sentence` objects.
        """
        return ((1, r, p) for (r, p) in zip(reference, prediction))


############################################################


class AbstractMWEEvaluator(object):
    """Base class for MWE evaluation algorithms.  A `sentence_aligner`
    is used to align sentences in corpora and the algorithm only compares
    MWEs inside aligned sentence pairs.

    Subclasses should override `compare_sentences` or use the default
    symmetrical implementation and override `_one_sided_compare` instead.
    """
    def __init__(self, sentence_aligner):
        self._sentence_aligner = sentence_aligner

    def compare_sentence_lists(self, reference, prediction):
        r"""Compare two corpora and return a EvaluationResult.
        @param reference: A list of `Sentence` objects.
        @param prediction: A list of `Sentence` objects.
        """
        ret = measuring.EvaluationResult()
        alignment = self._sentence_aligner \
                .aligned_sentence_lists(reference, prediction)
        for mul, s_ref, s_pred in alignment:
            ret += mul * self.compare_sentences(s_ref, s_pred)
        return ret

    def compare_sentences(self, s_reference, s_prediction):
        r"""Compare the `MWEOccurrence`s in both `Sentence`s
        and return an EvaluationResult.
        @param s_reference: A `Sentence` object.
        @param s_prediction: A `Sentence` object.
        """
        # Default implementation: call `_one_sided_compare`
        #   twice, for a symmetric comparison between sentences
        return measuring.EvaluationResult((
            self._one_sided_compare(s_reference, s_prediction),
            self._one_sided_compare(s_prediction, s_reference)))

    def _one_sided_compare(self, s_a, s_b):
        r"""Compare the `MWEOccurrence`s in both `Sentence`s
        and return a OneSidedComparison object.
        Subclasses do NOT need to override this method if
        `compare_sentences` has been overridden.

        @param s_a: A `Sentence` object.
        @param s_a: A `Sentence` object.
        """
        raise NotImplementedError


class ExactMatchMWEEvaluator(AbstractMWEEvaluator):
    """MWE evaluation algorithm in which each comparison has
    value 1 if two MWEs have the same indexes and 0 otherwise.
    (See `AbstractMWEEvaluator`).
    """
    def _one_sided_compare(self, s_a, s_b):
        ret = measuring.OneSidedComparison()
        indexes_a = set(tuple(mweo.indexes) for mweo in s_a.mweoccurs)
        for mweo in s_b.mweoccurs:
            ret.add(tuple(mweo.indexes) in indexes_a, 1)
        return ret


class LinkBasedMWEEvaluator(AbstractMWEEvaluator):
    """MWE evaluation algorithm in which comparisons are performed
    on each "link", where a link is a pair of consecutive tokens inside
    a MWE (See Schneider [2014] at TACL).

    The value of a link is 1 if both reference and prediction
    sentences have that link and 0 otherwise.
    (See `AbstractMWEEvaluator`).
    """
    def _one_sided_compare(self, s_a, s_b):
        ret = measuring.OneSidedComparison()
        # links_a = all links in flattened(s_a.mweoccurs.indexes)
        links_a = set(link for mweo in s_a.mweoccurs \
                for link in zip(mweo.indexes, mweo.indexes[1:]))
        for mweo_b in s_b.mweoccurs:
            for link_b in zip(mweo_b.indexes, mweo_b.indexes[1:]):
                ret.add(link_b in links_a, 1)
        return ret


###########################################################


SENTENCE_ALIGNERS = {
    "Naive": NaiveSentenceAligner,
}
MWE_EVALUATORS = {
    "ExactMatch": ExactMatchMWEEvaluator,
    "LinkBased": LinkBasedMWEEvaluator,
}


############################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global reference_fname
    global mwe_evaluator
    global corpus_filetype_ext
    global reference_filetype_ext

    sentence_aligner_class = NaiveSentenceAligner
    mwe_evaluator_class = ExactMatchMWEEvaluator

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-r", "--reference"):
            reference_fname = a
        elif o in ("--sentence-aligner"):
            sentence_aligner_class = SENTENCE_ALIGNERS[a]
        elif o in ("-e", "--evaluator"):
            mwe_evaluator_class = MWE_EVALUATORS[a]
        elif o == "--corpus-from":
            corpus_filetype_ext = a
        elif o == "--reference-from":
            reference_filetype_ext = a
        else:
            raise Exception("Bad arg: " + o)

    if not reference_fname:
        ctxinfo.error("No reference file given!")

    sentence_aligner = sentence_aligner_class()
    mwe_evaluator = mwe_evaluator_class(sentence_aligner)


        
################################################################################  
# MAIN SCRIPT


if __name__ == "__main__":
    longopts = ["reference=", "sentence-aligner=", "evaluator=", "reference-from=", "corpus-from="]
    args = util.read_options("r:e:", longopts, treat_options, -1, usage_string)
    reference = parse_entities([reference_fname], reference_filetype_ext)
    prediction = parse_entities(args, corpus_filetype_ext)
    results = mwe_evaluator.compare_sentence_lists(reference, prediction)
    util.verbose("DEBUG:" + str(results))
    print("Precision:", util.portable_float2str(results.precision()))
    print("Recall:", util.portable_float2str(results.recall()))
    print("F-measure:", util.portable_float2str(results.f_measure()))
