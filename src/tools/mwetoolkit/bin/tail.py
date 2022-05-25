#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

# ###############################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# tail.py is part of mwetoolkit
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
    Prints the last N entities of a list. Works like the "tail" command in
    the unix platform, only it takes a file in xml format as input.

    This script is DTD independent, that is, it might be called on a corpus
    file, on a list of candidates or on a dictionary.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs import util
from libs import filetype


################################################################################
# GLOBALS

usage_string = """\
Usage: {progname} OPTIONS <input-file>
Print last N entries in input file.

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

-n <n-entities> OR --number <n-entities>
    Number of entities that you want to print out. Default value is 10.

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
limit = 10
input_filetype_ext = None
output_filetype_ext = None


################################################################################

class TailPrinterHandler(filetype.ChainedInputHandler):
    """For each entity in the file, prints it if the limit is still not
    achieved. No buffering as in tail, this is not necessary here.
    """
    def __init__(self, limit):
        self.limit = limit
        self.entity_counter = 0
        self.entity_buffer = [None] * limit
        self.prec_comments = []

    def before_file(self, fileobj, ctxinfo):
        if self.chain is None:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)

    def handle_comment(self, comment, ctxinfo):
        """Saves the comments in a temporary list so that the next 
        entity can save them in the buffer.        

        @param comment: A `Comment` object.
        """
        self.prec_comments.append(comment)  

    def _fallback_entity(self, entity, ctxinfo):
        """For each entity in the corpus, puts it in a circular buffer. This is
        necessary because we do not know the total number of lines, so we always
        keep the last n lines in the global buffer.
        
        @param entity A subclass of `Ngram` that is being read from the XM.
        """
        if self.limit > 0:
            self.entity_buffer[self.entity_counter % self.limit] = (entity,  self.prec_comments, ctxinfo)
            self.prec_comments = []
            self.entity_counter += 1


    def after_file(self, fileobj, ctxinfo):
        """After we read all the file, we can finally be sure about which lines
        need to be printed. Those correspond exactly to the N last lines added
        to the buffer.
        """
        for i in range(min(self.limit, self.entity_counter)):
            #pdb.set_trace()
            # entity_buffer is a circular buffer. In order to print the entities in
            # the correct order, we go from the cell immediately after the last one
            # stored in the buffer (position entity_counter) until the 
            # last one stored in the buffer (position entity_counter-1). If there
            # are less entities in the file than the limit, this padding is not
            # needed and we simply go from 0 until entity_counter-1
            index = (self.entity_counter + i) % min(self.limit, self.entity_counter)
            if self.entity_buffer[index] != None:
                entity, comments, ctxinfo = self.entity_buffer[index]
                for comment in comments :
                    self.chain.handle_comment(comment, ctxinfo)
                self.chain.handle(entity, ctxinfo)
            else:
                break
        self.chain.after_file(fileobj, ctxinfo)


################################################################################  

def treat_options(opts, arg, n_arg, usage_string):
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.    
    """
    global limit
    global input_filetype_ext
    global output_filetype_ext

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("-n", "--number"):
            limit = ctxinfo.parse_uint(a)
        else:
            raise Exception("Bad arg: " + o)


################################################################################
# MAIN SCRIPT

args = util.read_options("n:", ["from=", "to=", "number="], treat_options, -1, usage_string)
filetype.parse(args, TailPrinterHandler(limit), input_filetype_ext)
