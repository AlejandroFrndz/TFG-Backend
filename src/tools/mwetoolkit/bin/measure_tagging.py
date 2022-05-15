#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# measure_tagging.py is part of mwetoolkit
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
This script measures how well a corpus has been tagged when compared to a
reference.

For more information, call the script with no parameter and read the
usage instructions.
"""


import collections
import itertools
import sys

from libs import util
from libs.base import measuring
from libs.filetype import parse_entities




################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} -a <attr> -r <reference> OPTIONS <corpus>
Compare tagged corpus vs reference. Output a summary of tag correctness.

-a <attr> OR --attribute <attr>
    The name of the attribute to check for tag correctness.

-r <reference> OR --reference <reference>
    A gold-standard corpus with properly tagged words, in one
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

{common_options}
"""

reference_fname = None
corpus_filetype_ext = None
reference_filetype_ext = None
attr_name = None


################################################################################

class TaggingEvaluator(object):
    """Algorithm that evaluates tagging."""
    def compare_and_print_sentence_lists(self, reference, prediction):
        r"""Compare two corpora and print a summary."""
        print("SenseTag", "POS", "N-Preds", "Precision", "N-Gold", "Recall", "F1", sep="\t")
        def print_eval_result(sensetag, postag, eval_result):
            print(sensetag, postag,
                    eval_result.prediction_comparison.attempts,
                    util.portable_float2str(eval_result.precision()),
                    eval_result.reference_comparison.attempts,
                    util.portable_float2str(eval_result.recall()),
                    util.portable_float2str(eval_result.f_measure()), sep="\t")

        total = measuring.EvaluationResult()
        ret_set = self.compare_sentence_lists(reference, prediction)
        for (sensetag, postag), eval_result in sorted_retset(ret_set):
            print_eval_result(sensetag, postag, eval_result)
            total += eval_result

        print_eval_result("TOTAL", "---", total)


    def compare_sentence_lists(self, reference, prediction):
        r"""Compare two corpora and return a EvaluationResult.
        @param reference: A list of `Sentence` objects.
        @param prediction: A list of `Sentence` objects.
        """
        self.ret_set = {}  # a dict {(sensetag, postag): EvaluationResult}
        for i, (s_ref, s_pred) in enumerate(zip(reference, prediction)):
            assert len(s_ref) == len(s_pred), (i, len(s_ref), len(s_pred))
            self.one_sided_compare("P", s_pred, s_ref)
            self.one_sided_compare("R", s_ref, s_pred)
        return self.ret_set


    def get_one_sided_comparison(self, sensetag, postag, comp_type):
        r"""Return a `measuring.OneSidedComparison` for given arguments."""
        try:
            eval_result = self.ret_set[(sensetag, postag)]
        except KeyError:
            eval_result = self.ret_set[(sensetag, postag)] = measuring.EvaluationResult()
        return eval_result.get_one_sided_comparison(comp_type)


    def one_sided_compare(self, comp_type, s_main, s_evaluated):
        r"""Compare sentences and return a OneSidedComparison object.
        @param s_a: The main `Sentence` object.
        @param s_a: The evaluated `Sentence` object.
        """
        for i, w in enumerate(s_main):
            try:
                sensetag = w.get_prop(attr_name)
            except KeyError:
                pass  # Ignore missing prop
            else:
                comp = self.get_one_sided_comparison(sensetag, w.pos, comp_type)
                evaled_sensetag = s_evaluated[i].get_prop(attr_name, None)
                comp.add(int(evaled_sensetag == sensetag), 1)


def sorted_retset(ret_set):
    r"""Return pairs of elements in `ret_set`, rev-sorted by N-Gold."""
    ret = list(ret_set.items())
    ret.sort(key=lambda __eval_res: \
            __eval_res[1].reference_comparison.attempts, reverse=True)
    return ret


############################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global reference_fname
    global corpus_filetype_ext
    global reference_filetype_ext
    global attr_name

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-r", "--reference"):
            reference_fname = a
        elif o in ("-a", "--attribute"):
            attr_name = a
        elif o == "--corpus-from":
            corpus_filetype_ext = a
        elif o == "--reference-from":
            reference_filetype_ext = a
        else:
            raise Exception("Bad arg: " + o)

    if not attr_name:
        ctxinfo.error("No attribute name given!")
    if not reference_fname:
        ctxinfo.error("No reference file given!")


        
################################################################################  
# MAIN SCRIPT


if __name__ == "__main__":
    longopts = ["reference=", "attribute=", "reference-from=", "corpus-from="]
    args = util.read_options("r:a:", longopts, treat_options, -1, usage_string)
    reference = parse_entities([reference_fname], reference_filetype_ext)
    prediction = parse_entities(args, corpus_filetype_ext)
    TaggingEvaluator().compare_and_print_sentence_lists(reference, prediction)
