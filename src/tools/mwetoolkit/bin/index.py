#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# index.py is part of mwetoolkit
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
    This script creates an index file for a given corpus. 

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs import util
from libs.filetype import indexlib

################################################################################

usage_string = """\
Usage: {progname} OPTIONS -i <index> <corpus>
Build set of index files for fast execution of count.py.

-i <index> OR --index <index>
    Base name for the output index files. This is used as a prefix for all index
    files generated, such as <index>.lemma.corpus, <index>.lemma.suffix, etc.
    
The <corpus> input file must be in one of the filetype
formats accepted by the `--from` switch.

The -i <index> option is mandatory.


OPTIONS may be:    

-a <attrs> OR --attributes <attrs>
    Generate indices only for the specified attributes. <attrs> is a
    colon-separated list of attributes (e.g. lemma,pos,lemma+pos).

-o OR --old
    Use the old (slower) Python indexer, even when the C indexer is available.

--from <input-filetype-ext>
    Force reading of corpus with given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}
   
{common_options}
"""
use_text_format = None
input_filetype_ext = None
basename = None


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.
        
        @param opts The options parsed by getopts. Ignored.
        
        @param arg The argument list parsed by getopts.
        
        @param n_arg The number of arguments expected for this script.    
    """
    global used_attributes
    global basename
    global build_entry
    global use_text_format
    global input_filetype_ext
    global ctxinfo

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)
    used_attributes = ["lemma", "pos", "surface", "syn"]

    for o, a in ctxinfo.iter(opts):
        if o in ("-i", "--index") :
            if a.endswith(".info"):  # only counter.py takes a `BLABLA.info`
                ctxinfo.error("This option does not take a `.info` suffix")
            basename = a
        elif o == "--from":
            input_filetype_ext = a
        elif o in ("-a", "--attributes"):
            if "," not in a and ":" in a:
                # We don't want to break e.g. "@conllX:feat" as two attrs...
                ctxinfo.error("Semantics have changed; new separator is `,`")
            used_attributes = a.split(",")

        elif o in ("-m", "--moses"):
            use_text_format = "moses"
        elif o in ("-c", "--conll"):
            use_text_format = "conll"            
        elif o in ("-o", "--old"):
            indexlib.Index.use_c_indexer(False, ctxinfo)
            
    if basename is None:     
        ctxinfo.error("You must provide a filename for the index. " \
              "Option -i is mandatory.")

                            
################################################################################
# MAIN SCRIPT

longopts = ["from=", "index=", "attributes=", "old", "moses", "conll" ]
arg = util.read_options( "i:a:omc", longopts, treat_options, -1, usage_string )

simple_attrs = [a for a in used_attributes if '+' not in a]
composite_attrs = [a for a in used_attributes if '+' in a]

for attrs in [attr.split('+') for attr in composite_attrs]:
    for attr in attrs:
        if attr not in simple_attrs:
            simple_attrs.append(attr)


index = indexlib.Index(basename, simple_attrs, ctxinfo=ctxinfo)
index.populate_index(arg, input_filetype_ext, ctxinfo=ctxinfo)
for attr in composite_attrs:
    index.make_fused_array(attr.split('+'), ctxinfo)
#index.build_suffix_arrays()
#index.save_main()
