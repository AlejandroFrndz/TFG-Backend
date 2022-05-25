#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# dimsum_sensetag.py is part of mwetoolkit
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
    Assign DiMSUM's sense-tags to each word.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import codecs
import collections
import sys

from libs import util
from libs import filetype
from libs.base.sentence import Sentence
from libs.base.word import Word


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} -m <method> -t <train-file> OPTIONS <input-file>
Tag each word according with a DiMSUM sense-tag.

-m <method> OR --method <method>
    Name of the method to use for tagging.
    * Method "LiterallyMostCommonSense": VERB=v.stative,
      NOUN=n.person, PROPN=n.group, always.
    * Method "MostCommonSense": most common sense
      for that lemma/pos.  Able to --use-wordnet.
    * Method "Zero": never tag anything.
    * Method "Debug": outputs debugging info, does not tag.
    This flag may be specified multiple times, to choose fallbacks.

-t <train-file> OR --train <train-file>
    A corpus file with correctly tagged entries.
    The <train-file> must be a "DiMSUM" corpus file.

The <input-file> must be in one of the filetype
formats accepted by the `--corpus-from` switch.


OPTIONS may be:

--corpus-from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[ALL]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, outputs in "DiMSUM" file format):
    {descriptions.output[ALL]}

--use-wordnet
    Use wordnet, if applicable.

--debug-file <filename>
    Output debug info here.

{common_options}
"""
train_filetype_ext = "DiMSUM"
input_filetype_ext = None
output_filetype_ext = "DiMSUM"
train_file = None
the_taggers = []
use_wordnet = False
debug_file = None


################################################################################


def iter_xwes(sentence):
    r"""Iterate through single/multiword items.
    Yields lists of 1 or more `Word`s each.
    """
    ret = [[i] for i in range(len(sentence))]
    for mweo in sentence.mweoccurs:
        indexes = mweo.indexes
        ret[indexes[0]] = indexes
        for i in indexes[1:]:
            ret[i] = None
    return [x for x in ret if x]


class TrainFileHandler(filetype.InputHandler):
    """For each entity in the file, run the given commands."""
    def handle_sentence(self, sentence, ctxinfo):
        r"""Called to tag words in sentence."""
        for t in the_taggers:
            t.handle_train_sentence(sentence, ctxinfo)


class TaggerHandler(filetype.ChainedInputHandler):
    """For each entity in the file, run the given commands."""
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)
        self.sent_num = 0

    def handle_sentence(self, sentence, ctxinfo):
        r"""Called to tag words in sentence."""
        self.sent_num += 1
        for indexes in iter_xwes(sentence):
            words = [sentence[i] for i in indexes]
            for tagger in the_taggers:
                tag = tagger.calculate_tag(words, ctxinfo)
                if tag:
                    words[0].set_prop("@dimsum:senseclass", tag)
                    break  # stop trying to look for this tag
            else:
                if debug_file and words[0].pos in ("VERB","NOUN","PROPN"):
                    print("Unable to tag: {}/{} (sent {})" \
                            .format(words[0].lemma, words[0].pos, self.sent_num),
                            file=debug_file)
        self.chain.handle_sentence(sentence, ctxinfo)


############################################################

class AbstractTagger(object):
    def handle_train_sentence(self, sentence, ctxinfo):
        r"""Called to collect data from train file."""
        pass  # default: ignore the train file

    def calculate_tag(self, words, ctxinfo):
        r"""Called by `handle_sentence` to get tag for word/MWE.  Should be
        overridden, except if `handle_sentence` is overridden instead.
        """
        raise NotImplementedError

    def finish(self):
        pass  # default: finish quietly



class ZeroTagger(AbstractTagger):
    r"""Do not tag anything."""
    def calculate_tag(self, words, ctxinfo):
        return None


class DebugTagger(AbstractTagger):
    r"""Do not tag anything. Output stats at the end."""
    def __init__(self, prefix="Missing:"):
        self.missing = collections.Counter()
        self.prefix = prefix

    def calculate_tag(self, words, ctxinfo):
        if words[0].pos in ("VERB", "NOUN", "PROPN"):
            self.missing[words[0].pos] += 1

    def finish(self):
        print(self.prefix, self.missing, file=sys.stderr)


class LiterallyMCSTagger(AbstractTagger):
    r"""Tags verbs as `v.stative`, nouns as `n.person`. Does not tag MWEs."""
    def calculate_tag(self, words, ctxinfo):
        if len(words) != 1: return
        if words[0].pos == "VERB":
            return "v.stative"
        elif words[0].pos == "NOUN":
            return "n.person"
        elif words[0].pos == "PROPN":
            return "n.group"
        return None


class MCSTagger(AbstractTagger):
    r"""Tags based on most common sense for lemma/pos."""
    def __init__(self):
        self.w2info = collections.defaultdict(collections.Counter)
        self.wn_built = False

    def handle_train_sentence(self, sentence, ctxinfo):
        for indexes in iter_xwes(sentence):
            words = [sentence[i] for i in indexes]
            if words[0].has_prop("@dimsum:senseclass"):
                sense = words[0].get_prop("@dimsum:senseclass")
                self.w2info[tuple((w.lemma, w.pos) for w in words)][sense] += 1

    def calculate_tag(self, words, ctxinfo):
        if use_wordnet: self.build_wn()
        for mwekey in self._possible_mwekeys(words):
            if mwekey in self.w2info:
                return self.w2info[mwekey].most_common(1)[0][0]

    def _possible_mwekeys(self, words):
        r"""Yield keys for given word.
        E.g. [("eat", "VERB")] or [("go", "VERB"), ("home", "NOUN")]
        """
        yield tuple((w.lemma, w.pos) for w in words)

        if use_wordnet:
            w = words[0]  # simpler for now
            for hypernym_lemmapos in self.wn_iter_hypernyms(w.lemma, w.pos):
                yield tuple(hypernym_lemmapos)


    def build_wn(self):
        if self.wn_built: return
        untouchable = set(self.w2info)  # we only add stuff we haven't seen
        for mwekey in list(self.w2info):
            sense, count = self.w2info[mwekey].most_common(1)[0]
            for hypernym_lemmapos in self.wn_iter_hypernyms(*mwekey[0]):
                if not tuple(hypernym_lemmapos) in untouchable:
                    self.w2info[tuple(hypernym_lemmapos)][sense] += count
        self.wn_built = True

    def wn_iter_hypernyms(self, lemma, pos):
        from nltk.corpus import wordnet as wn
        wn_pos = {"VERB": "v", "NOUN": "n", "PROPN": "n"}.get(pos, None)
        for synset in (wn.synsets(lemma, wn_pos) or wn.synsets(lemma))[:1]:
            for lemmaobj in synset.lemmas:
                yield [(lemmaobj.name, pos)]



################################################################################

TAGMETHODS = {
    "Debug": DebugTagger,
    "Zero": ZeroTagger,
    "LiterallyMostCommonSense": LiterallyMCSTagger,
    "MostCommonSense": MCSTagger,
}


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global the_taggers
    global train_file
    global input_filetype_ext
    global output_filetype_ext
    global use_wordnet
    global debug_file

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--corpus-from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("-m", "--methods"):
            the_taggers.append(TAGMETHODS[a]())
        elif o in ("-t", "--train"):
            train_file = a
        elif o == "--use-wordnet":
            use_wordnet = True
        elif o == "--debug-file":
            debug_file = codecs.open(a, "w+", encoding='utf8')
        else:
            raise Exception("Bad arg " + o)

    if train_file is None:
        ctxinfo.error("No train file specified!")
    if not the_taggers:
        ctxinfo.error("No tag method specified!")

    the_taggers = [DebugTagger("Before:")] \
            + the_taggers + [DebugTagger("After:")]



################################################################################
# MAIN SCRIPT

longopts = ["corpus-from=", "to=", "method=", "train=", "use-wordnet", "debug-file="]
args = util.read_options("m:t:", longopts, treat_options, -1, usage_string)
filetype.parse([train_file], TrainFileHandler(), train_filetype_ext)
filetype.parse(args, TaggerHandler(), input_filetype_ext)
for t in the_taggers: t.finish()
