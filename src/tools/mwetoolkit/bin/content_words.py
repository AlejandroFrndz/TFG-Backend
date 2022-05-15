#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# content_words.py is part of mwetoolkit
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
    This script filters the input and leaves only the content words.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import re

from libs import util
from libs.base.sentence import Sentence
from libs import filetype


     
################################################################################     
# GLOBALS     
usage_string = """\
Usage: {progname} -t <tagset> OPTIONS <input-file>
Remove from corpus all words that are not NOUN/VERB/ADJ/ADV.
MWEs are kept in the corpus, even if they contain stopwords.

-t <tagset-name> OR --tagset <tagset-name>
    Use given tagset to interpret input corpus:
    {tagsets.all}

The <input-file> must be in one of the filetype
formats accepted by the `--input-from` switch.


OPTIONS may be:

--input-from <input-filetype-ext>
    Force input conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[ALL]}

--protect-from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, keeps output in same format as input):
    {descriptions.output[ALL]}

--clean-special
    Remove all words whose lemma contains special characters,
    such as numbers or repeated symbols.

--placeholder <python-str-format>
    Replace lemmas of sparse content words (proper names, numbers...)
    by given placehold string instead.
    Example: --placeholder="placehold-{{w.pos}}"

--protect <candidates>
    Protect every word in this file (does not filter out and
    does not replace by placeholder).

{common_options}
"""

input_filetype_ext = None
protect_filetype_ext = None
output_filetype_ext = None
placeholder_format = None
clean_special = False
protect_filename = None
protected_words = set()
tagset = None


################################################################################

# Matches only words that do not contain special chars
NOSPECIAL = re.compile(r"^[^\W\d_]+([-_' ][^\W\d_]+)*$", re.UNICODE)


class ConverterHandler(filetype.ChainedInputHandler):

    def __init__(self, clean_special=False):
        super(filetype.ChainedInputHandler, self)
        self.clean_special = clean_special
        
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)

    def handle_sentence(self, sentence, ctxinfo):
        new_indexes = []
        # TODO REWRITE because this is broken on overlapping MWEs
        # TODO we should keep a set of all MWE indexes, to avoid transforming
        # them in placeholders when calling self.change
        for inds in sentence.xwe_indexes():
            if len(inds) != 1:
                new_indexes.extend(inds)
            else:
                if self.should_keep(sentence[inds[0]]):
                    new_indexes.extend(inds)
        sentence = sentence.sub_sentence(new_indexes, ctxinfo)
        sentence.word_list = [self.change(w) for w in sentence]
        self.chain.handle_sentence(sentence, ctxinfo)


    def should_keep(self, word):
        r"""Return whether `word` should be kept."""
        if word.lemma_or_surface() in protected_words:
            return True  # We keep protected words regardless of POS-tags
        return tagset.is_content(word.pos.upper()) and \
                (not self.clean_special or NOSPECIAL.match(word.lemma))


    def change(self, word):
        r"""Convert lemma to placeholder."""
        if placeholder_format and word.has_prop("pos"):
            if tagset.is_sparse(word.pos.upper()) and \
                    word.lemma_or_surface() not in protected_words:
                word.lemma = placeholder_format.format(w=word)
        return word


def treat_options(opts, arg, n_arg, usage_string):
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global input_filetype_ext
    global protect_filetype_ext
    global output_filetype_ext
    global clean_special
    global protect_filename
    global protect_words
    global placeholder_format
    global tagset

    tagset_name = None
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == ("--input-from"):
            input_filetype_ext = a
        elif o == ("--protect-from"):
            protect_filetype_ext = a
        elif o == ("--to"):
            output_filetype_ext = a
        elif o == ("--protect"):
            protect_filename = a
        elif o in ("-t", "--tagset"):
            tagset_name = a
        elif o == "--placeholder":
            from string import Formatter as F
            list(F().parse(a))  # Check if format is good
            placeholder_format = a
        elif o == "--clean-special":
            clean_special = True
        else:
            raise Exception("Bad arg: " + o)

    if not tagset_name:
        ctxinfo.error("Option -t is mandatory")

    import libs.tagset
    tagset = libs.tagset.NAME2TAGSET[tagset_name]

    if protect_filename:
        for entity in filetype.parse_entities(
                [protect_filename], protect_filetype_ext):
            for word in entity:
                protected_words.add(word.lemma_or_surface().lower())


################################################################################
# MAIN SCRIPT

longopts = ["input-from=", "protect-from=", "to=", "placeholder=",
        "clean-special", "protect=", "tagset="]
args = util.read_options("t:", longopts, treat_options, -1, usage_string)
handler = ConverterHandler(clean_special)
filetype.parse(args, handler, input_filetype_ext)
