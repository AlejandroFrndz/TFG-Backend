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
Usage: {progname} OPTIONS <corpus>
Extract MWE lexicon from annotated corpus.

The <corpus> input file must be in one of the filetype
formats accepted by the `--from` switch.
    

OPTIONS may be:

--from <input-filetype-ext>
    Force reading corpus from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--to <output-filetype-ext>
    Output extracted candidates in given filetype format
    (By default, outputs in "XML" candidate format):
    {descriptions.output[candidates]}

-G <attrs> OR --group-by <attrs>
    Group output candidates by given attributes.
    <attrs> is a list of word-level attributes separated by '+'
    By default, groups by lemma.
    Example: --group-by="lemma+pos"
    

-f OR --freq     
    Output the number of occurrences for each candidate.

-S OR --source
    Output a <source> tag with the IDs of the sentences where each ngram occurs.
    The syntax is `ID_A:w1,w2,w3...wN;ID_B:w1,w2...;ID_K:w1,w2...`.
    Example: "158:48,49;455:8,9".

--output-only <value>
    * "Gappy": Output only gappy MWEs.
    * "Contig": Output only contiguous.
    By default, output both.

{common_options}
"""
print_cand_freq = False
print_source = False
group_by = set(["lemma"])
only_gappy = only_contig = False

input_filetype_ext = None
output_filetype_ext = "XML"


################################################################################
       
class CandidatesExtractorHandler(filetype.ChainedInputHandler):
    r"""An InputHandler that extracts Candidates."""
    
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
        """Comments from input corpus should not be passed to candidates 
           file"""
        pass

    def handle_sentence(self, sentence, ctxinfo):
        """Extract each annotated candidate and append
        it into `self.all_entities`.
        """
        for mweoccur in sentence.mweoccurs:
            if only_gappy and not mweoccur.is_gappy(): continue
            if only_contig and not mweoccur.is_contiguous(): continue

            wordnums = mweoccur.indexes
            candidate = self.candidate_factory.make([sentence[i].copy() for i in wordnums])
            wordnums_string = ",".join(str(wn+1) for wn in wordnums)            
            ngram_basestring_specific = str(candidate.to_string())
            if group_by:  # Special case: empty means "do not group"
                candidate.keep_only_props(group_by)

            # Avoid generating empty output candidates, that's ugly
            if any(len(w.get_props())==0 for w in candidate): continue

            ngram_basestring_general = str(candidate.to_string())
            info_for_ngram_basestring = self.all_entities.setdefault(
                    ngram_basestring_general, {})
            #if ngram_basestring_specific == '\x1dpełnić\x1d\x1cobowiązków\x1dobowiązek\x1dNOUN':
            #  import pdb
            #  pdb.set_trace()
            (surfaces_dict, total_freq) = info_for_ngram_basestring \
                    .get(self.current_corpus_name, ({}, 0))
            freq_surface = surfaces_dict.setdefault(ngram_basestring_specific, [])

            # Append the id of the source sentence. The number of items in
            # surfaces_dict[form] is the number of occurrences of that form.
            source_sent_id = str(sentence.id_number) + ":" + wordnums_string
            surfaces_dict[ngram_basestring_specific].append(source_sent_id)
            info_for_ngram_basestring[self.current_corpus_name] \
                    = (surfaces_dict, total_freq + 1)


    def finish(self, ctxinfo):
        self.print_candidates(self.chain, ctxinfo)
        self.chain.finish(ctxinfo)


    def print_candidates(self, chain, ctxinfo):
        """Prints candidates extracted by the handle_sentence callback function. 
        Repeated candidates are not printed several times: instead, each base 
        form has a joint frequency of the candidate in the corpus.
        """
        global print_cand_freq, print_source
        util.verbose("Outputting candidates file...")
        for ngram_basestring, info in self.all_entities.items():
            cand = self.candidate_factory.make()
            cand.from_string(ctxinfo, ngram_basestring)
            for corpus_name, (surface_dict, total_freq) in info.items():
                if print_cand_freq:
                   cand.add_frequency(Frequency(corpus_name, total_freq))
                for occur_string in list(surface_dict.keys()):
                    occur_form = Ngram(None, None)
                    occur_form.from_string(ctxinfo, occur_string)
                    sources = surface_dict[occur_string]
                    freq = Frequency(corpus_name, len(sources))
                    occur_form.add_frequency(freq)
                    if print_source:
                        occur_form.add_sources(sources)
                    cand.add_occur(occur_form)
            try:
              chain.handle_candidate(cand, ctxinfo)
            except Exception:
              import pdb
              pdb.set_trace()

        

################################################################################  

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global print_cand_freq
    global print_source
    global group_by
    global input_filetype_ext
    global output_filetype_ext
    global only_gappy
    global only_contig

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-S", "--source") :
            print_source = True
        elif o in ("-f", "--freq") : 
            print_cand_freq = True
        elif o in ("-G", "--group-by") : 
            group_by = set(a.split("+"))
        elif o == "--output-only" :
            only_gappy = (a == "Gappy")
            only_contig = (a == "Contig")
        elif o == "--from" :
            input_filetype_ext = a
        elif o == "--to" :
            output_filetype_ext = a
        else:
            raise Exception("Bad flag")

################################################################################  
# MAIN SCRIPT

longopts = [ "from=", "to=", "source", "freq", "group-by=", "output-only=" ]
arg = util.read_options("SfG:", longopts, treat_options, -1, usage_string )
filetype.parse(arg, CandidatesExtractorHandler(), input_filetype_ext)
