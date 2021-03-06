#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# transform.py is part of mwetoolkit
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
    Executes python string for each element of given input.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs import util
from libs import filetype
from libs.base.sentence import Sentence
from libs.base.word import Word


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} OPTIONS <input-file>
Apply transformation code to input file.
(Can also be used to convert between file formats).

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

-w <python-code> OR --each-word <python-code>
    Run python code for each word in the input files.

    The only things guaranteed to exist in the
    environment are the __builtins__, `Word` and the following:
    * `w`: a modifiable instance of `Word`.
    * `output.drop(cond=True)`: drop current word from output.
    * `output.add_before(w2, cond=True)`: add `w2` before the current word.
    * `output.add_after(w2, cond=True)`: add `w2` after the current word.

--begin <python-code>
    Run python code before starting to parse the first input file.
    Only __builtins__ is guaranteed to exist in the environment.

--end <python-code>
    Run python code after parsing the last input file.
    Only __builtins__ is guaranteed to exist in the environment.


--from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[ALL]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, keeps input in original format):
    {descriptions.output[ALL]}

{common_options}
"""
executable_w = None
executable_beg = ""
executable_end = ""
input_filetype_ext = None
output_filetype_ext = None


################################################################################

class TransformHandler(filetype.ChainedInputHandler):
    """For each entity in the file, run the given commands."""
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
            self.global_dict = {"__builtins__": __builtins__, "Word": Word}
            exec(executable_beg, self.global_dict)
        self.chain.before_file(fileobj, ctxinfo)

    def finish(self, ctxinfo):
        self.chain.flush(ctxinfo)
        exec(executable_end, self.global_dict)
        self.chain.finish(ctxinfo)

    def _fallback_entity(self, entity, ctxinfo):
        indexes = []
        D = self.global_dict
        output = D["output"] = OutputDescr()

        if executable_w:
            for i, word in enumerate(entity.word_list):
                D["w"] = word
                output._indexes.append(i)
                exec(executable_w, D)

        if not output._modified:
            pass  # Entity will not be modified anyway
        elif isinstance(entity, Sentence):
            entity = entity.sub_sentence(output._indexes, ctxinfo)
        else:
            # XXX IMPLEMENT
            ctxinfo.warn_once("BUG: IMPLEMENTME: IGNORING output restrictions")
        self.chain.handle(entity, ctxinfo)

    def handle_pattern(self, pattern, ctxinfo):
        self.chain.handle_pattern(pattern, ctxinfo)


class OutputDescr(object):
    r"""Describes the Word's of an Entity that will be output."""
    def __init__(self):
        self._indexes = []
        self._modified = False

    def index(self):
        r"""Return the index of current word."""
        return len(self._indexes)-1

    def drop(self, condition=True):
        r"""Drop current word from output. Return `self` for chaining."""
        if condition:
            self._modified = True
            self._indexes.pop()
        return self

    def add_before(self, w2, condition=True):
        r"""Insert `w2` before current word. Return `self` for chaining."""
        if condition:
            self._modified = True
            self._indexes.insert(-1, w2)
        return self

    def add_after(self, w2, condition=True):
        r"""Insert `w2` after current word. Return `self` for chaining."""
        if condition:
            self._modified = True
            self._indexes.append(w2)
        return self


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global executable_w
    global executable_beg
    global executable_end
    global input_filetype_ext
    global output_filetype_ext

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o == "--begin":
            executable_beg = compile(a, "<cmdline:--begin>", "exec")
        elif o == "--end":
            executable_end = compile(a, "<cmdline:--end>", "exec")
        elif o in ("-w", "--each-word"):
            executable_w = compile(a, "<cmdline:--each-word>", "exec")
        else:
            raise Exception("Bad arg " + o)

################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "begin=", "end=", "each-word="]
args = util.read_options("w:", longopts, treat_options, -1, usage_string)
filetype.parse(args, TransformHandler(), input_filetype_ext)
