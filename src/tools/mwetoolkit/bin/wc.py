#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# wc.py is part of mwetoolkit
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
    This script simply gives some stats about an input file, such as number
    of words, etc.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import os.path
import sys

from libs import util
from libs import filetype


################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} OPTIONS <input-file>
Count number of characters, words and entries.

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

--from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[ALL]}

{common_options}
"""    
input_filetype_ext = None


################################################################################     

class CounterHandler(filetype.InputHandler):
    def before_file(self, fileobj, ctxinfo):
        self.entity_counter = self.word_counter = self.char_counter = 0

    def handle_comment(self, comment, ctxinfo):
        pass  # We just ignore it
        
    def handle_meta(self, meta, ctxinfo):
        pass  # We just ignore it
        
    def _fallback_entity(self, entity, ctxinfo):
        """For each candidate/sentence, counts the number of occurrences, the 
        number of words and the number of characters in the surface form.
        @param entity A subclass of `Ngram` that is being read from the XML.
        """
        for word in entity:
            self.word_counter += 1
            self.char_counter += word.wc_length()
        self.entity_counter += 1


    def after_file(self, fileobj, ctxinfo):
        """Prints the entity, word and character counters."""
        filename = os.path.basename(ctxinfo.inputobj.filename)
        print(self.entity_counter, "entities in", filename)
        print(self.word_counter, "words in", filename)
        print(self.char_counter, "characters in", filename)


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global input_filetype_ext
    
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        else:
            raise Exception("Bad arg")


################################################################################
# MAIN SCRIPT

longopts = ["from="]
args = util.read_options("", longopts, treat_options, -1, usage_string)
filetype.parse(args, CounterHandler(), input_filetype_ext)
