#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# candidates.py is part of mwetoolkit
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
    This script extract Multiword Expression candidates from a raw corpus in 
    valid XML (mwetoolkit-corpus.dtd) and generates a candidate list in valid 
    XML (mwetoolkit-candidates.dtd). There are two possible extraction methods: 
    the -p option assumes that you have a patterns file in which you define 
    shallow morphosyntactic patterns (e.g. I want to extract Verb + Preposition
    pairs); the -n option assumes that you do not care about the type of the
    candidates and that you are trying to extract all possible ngrams from the
    corpus. The latter should only be used as a backoff strategy when you do not
    know anything about the corpus or language: do not expect to obtain 
    impressive results with it. Notice that in the -n option, ngrams are not
    extracted across sentence borders, since these would certainly not be
    interesting MWE candidates.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import collections
import re
import os

from libs.base.frequency import Frequency
from libs.base.candidate import CandidateFactory
from libs.base.ngram import Ngram
from libs import util
from libs.base.patternlib import build_generic_pattern
from libs.base.meta import Meta
from libs import filetype


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} [-p <patterns-file> | -e <expr> | -n <min>:<max>] OPTIONS <corpus>
Apply a pattern to corpus and output a lexicon of MWE candidates.

-p <patterns-file> OR --patterns <patterns-file>
    A file with the patterns to look for, in one of the filetype
    formats accepted by the `--patterns-from` switch.

-e <expr> or --textual-expr <expr>
    A string with the pattern to look for ("TextualPattern" format).

-n <min>:<max> OR --ngram <min>:<max>
    The length of ngrams to extract. For instance, "-n 3:5" extracts ngrams 
    that have at least 3 words and at most 5 words. If you define only <min> or
    only <max>, the default is to consider that both have the same value, i.e. 
    if you call the program with the option "-n 3", you will extract only 
    trigrams while if you call it with the options "-n 3:5" you will extract 
    3-grams, 4-grams and 5-grams. The value of <min> must be at least 1.

The <corpus> input file must be in one of the filetype
formats accepted by the `--corpus-from` switch.
    

OPTIONS may be:

-i OR --index
    (Deprecated. We currently detect BinaryIndex files automatically.
    To force detection, use --from=BinaryIndex.)

--corpus-from <input-filetype-ext>
    Force reading corpus from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--patterns-from <input-filetype-ext>
    Interpret patterns with given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[patterns]}

--to <output-filetype-ext>
    Output extracted candidates in given filetype format
    (By default, outputs in "XML" candidate format):
    {descriptions.output[candidates]}

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
     
-f OR --freq     
    Output the count of the candidate. This counter will merge the candidates if
    more than one pattern matches it, considering it as a single entry. The 
    counts of individual words in the candidate are NOT output by this option;
    you must use counter.py instead. Default false.

-g OR --ignore-pos
     Ignores parts of speech when counting candidate occurences. This means, for
     example, that "like" as a preposition and "like" as a verb will be counted 
     as the same entity. Default false.

-s OR --surface
    Counts surface forms instead of lemmas. Default false.

-S OR --source
    Output a <source> tag with the IDs of the sentences where each ngram occurs.
    The syntax is `ID_A:w1,w2,w3...wN;ID_B:w1,w2...;ID_K:w1,w2...`.
    Example: "158:48,49;455:8,9".

{common_options}
"""
ignore_pos = False
match_distance = "All"
non_overlapping = False
surface_instead_lemmas = False
print_cand_freq = False
longest_pattern = 0
shortest_pattern = float("inf")
print_source = False
id_order = ["*"]

patterns_fname = None
input_filetype_ext = None
patterns_filetype_ext = None
output_filetype_ext = "XML"


################################################################################
       
class CandidatesGeneratorHandler(filetype.ChainedInputHandler):
    r"""An InputHandler that generates Candidates."""
    
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo,
                    output_filetype_ext, category="candidates")
            self.chain.handle_meta(Meta(None,None,None), ctxinfo)
            self.candidate_factory = CandidateFactory()
            self.all_entities = collections.OrderedDict()

        self.chain.before_file(fileobj, ctxinfo)
        self.current_corpus_name = re.sub(".*/", "",
                re.sub("\.(xml|info)", "", fileobj.name))

    def handle_comment(self, comment, ctxinfo):
        """Ignore comments in the input corpus, output is list of 
        candidates so we do not want to pass comments forward."""
        pass

    def handle_sentence(self, sentence, ctxinfo):
        """For each sentence in the corpus, generates all the candidates that match
        at least one pattern in the patterns file (-p option) or all the
        ngrams that are in the valid range (-n option).
        
        @param sentence A `Sentence` that is being read from the XML file.    
        """
        global input_patterns, ignore_pos, surface_instead_lemmas, \
               longest_pattern, shortest_pattern

        already_matched = set()

        for pattern in input_patterns:
            for (match_ngram, wordnums) in pattern.matches(sentence,
                    match_distance=match_distance, id_order=id_order,
                    overlapping=not non_overlapping):
                wordnums_string = ",".join(str(wn+1) for wn in wordnums)
                if wordnums_string in already_matched:
                    continue
                already_matched.add( wordnums_string )

                if ignore_pos :    
                    match_ngram.foreach_del_prop("pos")
                ngram_basestring_specific = str(match_ngram.to_string())

                if surface_instead_lemmas:
                    match_ngram.foreach_del_prop("lemma")
                else :
                    for word in match_ngram:
                        # (Still uses surface if lemma is unavailable)
                        if word.has_prop("lemma"):
                            word.del_prop("surface")

                # TODO create a CandidateSet class to abstract away this grouping
                # of stuff based on general-vs-specific info
                ngram_basestring_general = str(match_ngram.to_string())
                info_for_ngram_basestring = self.all_entities.setdefault(
                        ngram_basestring_general, {})
                (surfaces_dict, total_freq) = info_for_ngram_basestring \
                        .get(self.current_corpus_name, ({}, 0))
                freq_surface = surfaces_dict.setdefault(ngram_basestring_specific, [])

                # Append the id of the source sentence. The number of items in
                # surfaces_dict[form] is the number of occurrences of that form.
                source_sent_id = str(sentence.id_number) + ":" + wordnums_string
                surfaces_dict[ ngram_basestring_specific ].append( source_sent_id )
                info_for_ngram_basestring[self.current_corpus_name] \
                        = (surfaces_dict, total_freq + 1)


    def finish(self, ctxinfo):
        self.print_candidates(self.chain, ctxinfo)
        self.chain.finish(ctxinfo)


    def print_candidates(self, chain, ctxinfo):
        """Prints a XML file (mwetoolkit-candidates.dtd) from a temporary 
        candidates file generated by the treat_sentence callback function. 
        Repeated candidates are not printed several times: instead, each base 
        form has a joint frequency of the candidate in the corpus. Since the
        new version of the "count.py" script, this initial frequency is only
        printed if you explicitely ask to do it through the -f option.

        @param filename: The file name of the corpus from which we generate the
        candidates.
        """
        global print_cand_freq, print_source
        util.verbose("Outputting candidates file...")
        for ngram_basestring_general, info in self.all_entities.items() :
            cand = self.candidate_factory.make()
            cand.from_string(ctxinfo, ngram_basestring_general)
            for corpus_name, (surface_dict, total_freq) in info.items():
                if print_cand_freq :
                   freq = Frequency( corpus_name, total_freq )
                   cand.add_frequency( freq )
                for occur_string in list(surface_dict.keys()) :
                    occur_form = Ngram( None, None )
                    occur_form.from_string(ctxinfo, occur_string)
                    sources = surface_dict[occur_string]
                    freq_value = len(sources)
                    freq = Frequency( corpus_name, freq_value )
                    occur_form.add_frequency( freq )
                    if print_source:
                        occur_form.add_sources(sources)
                    cand.add_occur( occur_form )
            # XXX chain another ContextInfo object indicating the source?
            chain.handle_candidate(cand, ctxinfo)

        
################################################################################  

def create_patterns_file( ctxinfo, ngram_range ) :
    """
        Create an artificial list of MWE patterns in which all the parts of
        the words are wildcards. Such artificial patterns match every ngram
        of size n, which is exactly what we want to do with the option -n. This
        may seem a weird way to extract ngrams, but it allows a single 
        transparent candidate extraction function, treat_sentence.
        
        @param ngram_range String argument of the -n option.
    """        
    global input_patterns, usage_string, shortest_pattern, longest_pattern
    input_patterns = []
    result = util.interpret_ngram( ngram_range )
    if result :
        ( shortest_pattern, longest_pattern ) = result
        input_patterns.append(build_generic_pattern(ctxinfo, shortest_pattern, longest_pattern))
    else :
        ctxinfo.error("Invalid argument for -n.")

################################################################################  

def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.
        
        @param opts The options parsed by getopts. Ignored.
        
        @param arg The argument list parsed by getopts.
        
        @param n_arg The number of arguments expected for this script.    
    """
    global input_patterns
    global patterns_fname
    global patterns_filetype_ext
    global ignore_pos
    global surface_instead_lemmas
    global print_cand_freq
    global print_source
    global match_distance
    global non_overlapping
    global input_filetype_ext
    global output_filetype_ext
    global id_order
    patterns_fname = None
    input_patterns = None

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-p", "--patterns"):
            patterns_fname = a
        elif o in ("-e", "--textual-expr"):
            import io
            bio = io.BytesIO(util.utf8_unicode2bytes(a))
            bio.name = "<cmdline-expr>"
            inputobjs = [filetype.common.InputObj(bio)]
            input_patterns = filetype.parse_entities(inputobjs,
                    filetype_hint="TextualPattern")
        elif o in ( "-n", "--ngram" ) :
            create_patterns_file(ctxinfo, a)
        elif o in ("-g", "--ignore-pos") : 
            ignore_pos = True
        elif o in ("-d", "--match-distance") : 
            match_distance = a
        elif o in ("-N", "--non-overlapping") : 
            non_overlapping = True
        elif o in ("-s", "--surface") : 
            surface_instead_lemmas = True
        elif o in ("-S", "--source") :
            print_source = True
        elif o in ("-f", "--freq") : 
            print_cand_freq = True
        elif o in ("-i", "--index") :
            input_filetype_ext = "BinaryIndex"
            ctxinfo.warn("Option -i is deprecated; use --from=BinaryIndex")
        elif o == "--id-order":
            id_order = a.split(":")
        elif o == "--corpus-from" :
            input_filetype_ext = a
        elif o == "--patterns-from" :
            patterns_filetype_ext = a
        elif o == "--to" :
            output_filetype_ext = a
        else:
            raise Exception("Bad flag")

    if patterns_fname:
        input_patterns = filetype.parse_entities([patterns_fname],
                filetype_hint=patterns_filetype_ext)

    if input_patterns is None:
        ctxinfo.error("No patterns provided. Option -p or -e or -n is mandatory!")

    if non_overlapping and match_distance == "All":
        # If we are taking all matches, we need to be able to overlap...
        ctxinfo.error("Conflicting options: --match-distance=All " \
                "and --non-overlapping")


################################################################################  
# MAIN SCRIPT

longopts = [ "corpus-from=", "patterns-from=", "to=", "patterns=", "ngram=", "index",
        "match-distance=", "non-overlapping", "freq", "ignore-pos",
        "surface", "source", "id-order=", "textual-expr=" ]
arg = util.read_options("p:n:id:NfgsSe:", longopts, treat_options, -1, usage_string )
filetype.parse(arg, CandidatesGeneratorHandler(), input_filetype_ext)
