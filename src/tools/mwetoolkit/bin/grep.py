#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# grep.py is part of mwetoolkit
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
    Filter the elements of the input that match given pattern.
    The matched pattern is also annotated as MWE.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs import util
from libs import filetype
from libs.base.candidate import CandidateFactory
from libs.base.mweoccur import MWEOccurrence


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} [-p <patterns-file> | -e <expr>] OPTIONS <input-file>
Filter input file according to pattern.

-p <patterns-file> OR --patterns <patterns-file>
    A file with the patterns to look for, in one of the filetype
    formats accepted by the `--patterns-from` switch.

-e <expr> or --textual-expr <expr>
    A string with the pattern to look for ("TextualPattern" format).

The <input-file> must be in one of the filetype
formats accepted by the `--input-from` switch.


OPTIONS may be:

--input-from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[ALL]}

--patterns-from <input-filetype-ext>
    Interpret patterns with given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[patterns]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, keeps input in original format):
    {descriptions.output[ALL]}

--only-matching
    Output only the matching parts of input entities, not the
    entities themselves.  Implies `--no-annotate`.

--no-annotate
    Do not annotate input entities with matches as MWEs.

-d <distance> OR --match-distance <distance>
    Select the distance through which patterns will match (default: "All"):
    * Distance "Shortest": Output the shortest matches (non-greedy).
    * Distance "Longest": Output the longest matches (greedy).
    * Distance "All": Output all match sizes.

-N OR --non-overlapping
    Do not output overlapping word matches.
    This option should not be used if match-distance is "All".

--id-order <list-of-ids>
    Output tokens in the pattern ID order given by the
    colon-separated <list-of-ids>.  The special ID "*" can be used
    to represent "all remaining IDs". Default: "*".
    Implies `--only-matching` and `--no-annotate`.

{common_options}
"""
patterns_fname = None
input_patterns = None
input_filetype_ext = None
patterns_filetype_ext = None
output_filetype_ext = None
match_distance = "All"
non_overlapping = False
only_the_matching_subpart = False
id_order = ["*"]
annotate = True


################################################################################

class GrepHandler(filetype.ChainedInputHandler):
    """For each entity in the file, match it against patterns
    and output it if the match was successful.
    """
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
            self.candidate_factory = CandidateFactory()
            self.global_dict = {}
        self.chain.before_file(fileobj, ctxinfo)


    def handle_candidate(self, original_cand, ctxinfo):
        matched = False
        for match_ngram, indexes in self._iter_matches(original_cand):
            matched = True
            # XXX not implementing global `annotate` for now
            if only_the_matching_subpart:
                cand = self.candidate_factory.make(match_ngram)
                self.chain.handle(cand, ctxinfo)

        if matched and not only_the_matching_subpart:
            self.chain.handle(original_cand, ctxinfo)


    def handle_sentence(self, sentence, ctxinfo):
        matched = False
        for match_ngram, indexes in self._iter_matches(sentence):
            matched = True
            cand = self.candidate_factory.make(match_ngram)
            cand.add_sources("{}:{}".format(sentence.id_number,
                    ",".join(str(wn+1) for wn in indexes)))

            if only_the_matching_subpart:
                subsent = sentence.sub_sentence(indexes, ctxinfo)
                self.chain.handle(subsent, ctxinfo)
            elif annotate:
                mweo = MWEOccurrence(sentence, cand, indexes)
                sentence.mweoccurs.append(mweo)

        if matched and not only_the_matching_subpart:
            self.chain.handle(sentence, ctxinfo)


    def _iter_matches(self, entity):
        for pattern in input_patterns:
            for (match_ngram, indexes) in pattern.matches(entity,
                    match_distance=match_distance, id_order=id_order,
                    overlapping=not non_overlapping):
                yield match_ngram, indexes


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global input_patterns
    global patterns_fname
    global input_filetype_ext
    global patterns_filetype_ext
    global output_filetype_ext
    global match_distance
    global non_overlapping
    global id_order
    global annotate
    global only_the_matching_subpart
    patterns_fname = None

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--input-from":
            input_filetype_ext = a
        elif o == "--patterns-from":
            patterns_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("-e", "--textual-expr"):
            import io
            bio = io.BytesIO(util.utf8_unicode2bytes(a))
            bio.name = "<cmdline-expr>"
            inputobjs = [filetype.common.InputObj(bio)]
            input_patterns = filetype.parse_entities(inputobjs,
                    filetype_hint="TextualPattern")
        elif o in ("-p", "--patterns"):
            patterns_fname = a
        elif o in ("-d", "--match-distance") : 
            match_distance = a
        elif o in ("-N", "--non-overlapping") : 
            non_overlapping = True
        elif o == "--id-order":
            id_order = a.split(":")
            only_the_matching_subpart = True
            annotate = False
        elif o == "--only-matching":
            only_the_matching_subpart = True
            annotate = False
        elif o == "--no-annotate":
            annotate = False
        else:
            raise Exception("Bad arg " + o)

    if patterns_fname:
        input_patterns = filetype.parse_entities([patterns_fname],
                filetype_hint=patterns_filetype_ext)

    if input_patterns is None:
        ctxinfo.error("No patterns provided. Option -p or -e is mandatory!")


################################################################################
# MAIN SCRIPT

longopts = ["input-from=", "patterns-from=", "to=", "patterns=",
        "match-distance=", "non-overlapping=", "id-order=", "no-annotate",
        "only-matching", "textual-expr="]
args = util.read_options("p:d:Ne:", longopts, treat_options, -1, usage_string)
filetype.parse(args, GrepHandler(), input_filetype_ext)
