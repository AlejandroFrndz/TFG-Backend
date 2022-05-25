#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# split.py is part of mwetoolkit
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
    Output fixed-size pieces of input file(s) into <prefix>001, <prefix>002, ...
    
    For more information, call the script with no parameter and read the
    usage instructions.
"""


import os
import subprocess
import sys

from libs import util
from libs import filetype


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} OPTIONS <input-file>
Output fixed-size pieces of input data into
files named x001, x002, ... xNNN.

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

-E <max-entities> OR --max-entities <max-entities>
    Maximum number of entities per output file.
    Default: infinity.

-W <max-words> OR --max-words <max-words>
    Maximum number of words per output file.
    Default: "10K" words.

--filter <shell-command>
    Pipe the output through given shell command.
    Inside the shell, these variables are valid:
    * $FILE: the file name (e.g. "x007")
    * $N: the file number (e.g. "7")

--prefix <prefix>
    The prefix for output file name.
    By default: "x".

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
out_prefix = "x"
filter_cmd = "cat >$FILE"
max_checkers = []
input_filetype_ext = None
output_filetype_ext = None


################################################################################

class SplitterHandler(filetype.InputHandler):
    """For each entity in the file, prints it if the limit is still not
    achieved. No buffering as in tail, this is not necessary here.
    """
    def __init__(self):
        self.file_idx = 0
        self.cur_size = 0
        self.environ = os.environ.copy()
        self.subp = None
        self.chain = None


    def _fallback_entity(self, entity, ctxinfo):
        """For each entity in the file, prints it if the limit is still not
        achieved. No buffering as in tail, this is not necessary here.

        @param entity: A subclass of `Ngram` that is being read from the XML.
        """
        old_file_idx = self.file_idx
        self.file_idx, self.cur_size = max(
                self.add_where(ctxinfo, entity, mc)
                for mc in max_checkers)
        if self.chain is None or self.file_idx != old_file_idx:
            self.make_chain(ctxinfo)
        self.chain.handle(entity, ctxinfo)


    def _fallback(self, obj, ctxinfo):
        r"""Handle comments/directives."""
        if self.chain is None:
            self.make_chain(ctxinfo)
        self.chain.handle(obj, ctxinfo)


    def make_chain(self, ctxinfo):
        r"""Make sure `self.chain` is not None."""
        self.finish_chain(ctxinfo)
        self.environ["N"] = str(self.file_idx)
        self.environ["FILE"] = "{}{:03d}".format(out_prefix, self.file_idx)
        self.subp = subprocess.Popen(filter_cmd, shell=True,
                stdin=subprocess.PIPE, stdout=sys.stdout,
                env=self.environ, bufsize=-1)
        self.chain = self.make_printer(ctxinfo,
                output_filetype_ext, output=self.subp.stdin)


    def finish_chain(self, ctxinfo):
        r"""Destroy `self.chain`."""
        if self.chain:
            self.chain.finish(ctxinfo)
            self.subp.communicate()
            self.chain = None


    def finish(self, ctxinfo):
        self.finish_chain(ctxinfo)


    def add_where(self, ctxinfo, entity, checker):
        r"""Return (file_index, current_size) indicating where to store `entity`."""
        length = checker.get_len(entity)
        if length > checker.n_max:
            ctxinfo.warn("Entity is too big for restriction {descr}={value}",
                    descr=checker.DESCR, value=length)
        if self.cur_size + length <= checker.n_max:
            self.cur_size += length
            return self.file_idx, self.cur_size
        else:
            self.cur_size = length
            self.file_idx += 1
            return self.file_idx, self.cur_size



############################################################

class MaxChecker(object):
    def __init__(self, n_max):
        self.n_max = n_max

class MaxEntitiesChecker(MaxChecker):
    DESCR = "max-entities"
    def get_len(self, entity):
        return 1

class MaxWordsChecker(MaxChecker):
    DESCR = "max-words"
    def get_len(self, entity):
        return len(entity)


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global input_filetype_ext
    global output_filetype_ext
    global max_checkers
    global filter_cmd
    global out_prefix
    
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("-E", "--max-entities"):
            max_checkers.append(MaxEntitiesChecker(ctxinfo.parse_uint(a)))
        elif o in ("-W", "--max-words"):
            max_checkers.append(MaxWordsChecker(ctxinfo.parse_uint(a)))
        elif o == "--filter":
            filter_cmd = a
        elif o == "--prefix":
            out_prefix = a
        else:
            raise Exception("Bad arg")

    max_checkers = max_checkers or [MaxWordsChecker(10*1000)]


################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "max-entities=", "max-words=", "filter=", "prefix="]
args = util.read_options("E:W:", longopts, treat_options, -1, usage_string)
filetype.parse(args, SplitterHandler(), input_filetype_ext)
