#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# cycle.py is part of mwetoolkit
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
    Infinitely cycles through input entities, printing each one in order.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs import util
from libs import filetype

################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} OPTIONS <input-file>
Cycle through all input entries (by default, infinite output).

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

-c <max-cycles> OR --max-cycles <max-cycles>
    Maximum number of full cycles to print out. Default is infinity.

-n <max-entities> OR --max-entities <max-entities>
    Maximum number of entities to print out.  Default is infinity.
    (Equivalent to piping output through `head.py -n`).

-s <num-entities> OR --skip <num-entities>
    Skip first <num-entities> entities. Default is 0.

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
n_skips = 0
number_limit = float('inf')
cycle_limit = float('inf')
input_filetype_ext = None
output_filetype_ext = None


################################################################################

class CyclingPrinterHandler(filetype.ChainedInputHandler):
    """For each entity in the file, prints it if the limit is still not
    achieved. No buffering as in tail, this is not necessary here.
    """
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
            self.total_count = 0
        self.chain.before_file(fileobj, ctxinfo)

        self.n = NumberLimiter(number_limit)
        self.c = CycleLimiter(cycle_limit)
        self.entity_buffer = []


    def _fallback_entity(self, entity, ctxinfo):
        r"""'See' entity and append it to buffer."""
        self.entity_buffer.append((entity, ctxinfo))
        self.see_entity_at(len(self.entity_buffer)-1)


    def after_file(self, fileobj, ctxinfo):
        r"""Keep 'seeing' entities stored in buffer."""
        while True:
            for i in range(len(self.entity_buffer)):
                self.see_entity_at(i)
        self.chain.after_file(fileobj, ctxinfo)


    def see_entity_at(self, index):
        r"""Output entity at given `index`."""
        if self.total_count >= n_skips:
            self.c.seeing_at(index)
            self.n.seeing_at(index)
            entity, ctxinfo = self.entity_buffer[index]
            self.chain.handle(entity, ctxinfo)
        self.total_count += 1


class CycleLimiter(object):
    r"""Instances check the number of cycles output and
    raise a StopParsing exception when needed."""
    def __init__(self, limit):
        self.limit = limit
        self.count = 0

    def seeing_at(self, index):
        if index == 0:
            self.count += 1
        if self.count > self.limit:
            raise filetype.StopParsing()


class NumberLimiter(object):
    r"""Instances check the number of entities output and
    raise a StopParsing exception when needed."""
    def __init__(self, limit):
        self.limit = limit
        self.count = 0

    def seeing_at(self, index):
        self.count += 1
        if self.count > self.limit:
            raise filetype.StopParsing()


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global n_skips
    global number_limit
    global cycle_limit
    global input_filetype_ext
    global output_filetype_ext
    
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("-n", "--max-entities"):
            number_limit = ctxinfo.parse_uint(a)
        elif o in ("-c", "--max-cycles"):
            cycle_limit = ctxinfo.parse_uint(a)
        elif o in ("-s", "--skip"):
            n_skips = ctxinfo.parse_uint(a)
        else:
            raise Exception("Bad arg")

################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "max-entities=", "max-cycle=", "skip="]
args = util.read_options("n:c:s:", longopts, treat_options, -1, usage_string)
filetype.parse(args, CyclingPrinterHandler(), input_filetype_ext)
