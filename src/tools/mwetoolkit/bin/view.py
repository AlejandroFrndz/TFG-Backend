#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
# 
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
# 
# view.py is part of mwetoolkit
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
    Pretty-print output with ANSI color codes, piped through a pager.
    If no `prop` attribute is specified, acts as if --mwe-prop=surface="green"
    had been specified.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import os
import re
import sys

from libs import util
from libs import filetype


################################################################################


usage_string = """\
Usage: {progname} OPTIONS <input-file>
Pretty-print file through a pager with syntax highlight (colors the MWEs).

The <input-file> must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

--prop <propname>=<color-descr>
    Color prop according to given color description.
    Equivalent to calling --swe-prop and --mwe-prop.
    Example: --prop=surface="bold,red"

    NOTE: Due to an internal implementation detail, the `pos` prop
    is colored according to `--metadata`, and thus it does not obey `--prop`.

--swe-prop <propname>=<color-descr>
    Color single-word prop according to given color description.
    Example: --prop=@coarse_pos="blue"

--mwe-prop <propname>=<color-descr>
    Color multi-word prop according to given color description.
    Example: --prop=lemma="green"

--default-prop <color-descr>
    In no other color is specified for a prop, use this one.
    By default, uses the color specification "darkgray".
    Example: --default-prop="blue"

--metadata <color-descr>
    Color file metadata according to given color description.
    Example: --metadata="white"

    NOTE: There is a /usr/bin/less bug(?) that prevents this from fully working.
    If you are using --metadata, you may need to pipe the output through something
    else ("less -r" works for the colors, but everything else becomes terrible).

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
input_filetype_ext = None
output_filetype_ext = None


################################################################################

ATTR2ANSI = {
    "reset": "0",
    "bold": "1",
    "invert": "7",
    "red": "31",
    "green": "32",
    "yellow": "33",
    "blue": "34",
    "magenta": "35",
    "cyan": "36",
    "white": "37",
    "lightgray": "38;05;245",
    "darkgray": "38;05;236",
    "orange": "38;05;208",
    "pink": "38;05;201",
}


################################################################################

class ViewHandler(filetype.ChainedInputHandler):
    """For each entity in the file, run the given commands."""
    def before_file(self, fileobj, ctxinfo):
        # XXX make these hardwired colors configurable by cmdline?
        self.COMMENT = ColorMapping.strings_to_ansi(["lightgray"])
        self.ESCAPE = ColorMapping.strings_to_ansi(["orange"])
        self.NEGATIVE = ColorMapping.strings_to_ansi(["invert"])

        if not self.chain:
            print(metadata_ansi, end="")
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
            self.chain_handle_comment = self.chain.handle_comment
            self.chain.handle_comment = self.middleman_handle_comment
            self.chain_write_directive = self.chain.write_directive
            self.chain.write_directive = self.middleman_write_directive
            self.comment_color = self.COMMENT
        self.chain.before_file(fileobj, ctxinfo)
    

    def middleman_handle_comment(self, comment, ctxinfo):
        self.chain.add_string(ctxinfo, self.comment_color)
        self.chain_handle_comment(comment, ctxinfo)
        self.chain.add_string(ctxinfo, metadata_ansi)

    def middleman_write_directive(self, directive, ctxinfo):
        self.comment_color = self.ESCAPE
        self.chain_write_directive(directive, ctxinfo)
        self.comment_color = self.COMMENT
        self.chain.add_string(ctxinfo, metadata_ansi)


    def _fallback_entity(self, entity, ctxinfo):
        mwe_indexes = set()
        if hasattr(entity, "mweoccurs"):
            for mweo in entity.mweoccurs:
                mwe_indexes.update(mweo.indexes)

        for i, w in enumerate(entity):
            c_mappings = mwe_color_mappings \
                    if (i in mwe_indexes) else swe_color_mappings
            for propname in w.get_props().keys():
                if propname == "syn":
                    # We do not color prop=syn, as it breaks everything,
                    # because Word.syn_iter splits at `;` and returns
                    # an int (which some printers will print as i+1)...
                    # So we should have a method that is explicitly called
                    # by printers to indicate what else needs to be colored...
                    # Too complicated, so we leave it out for now.
                    continue
                try:
                    ansi = c_mappings.prop_ansi(propname)
                except KeyError:
                    ansi = default_prop_ansi
                value = w.get_prop(propname)
                value = ansi + self.prettify_escapers(value, ansi) + metadata_ansi
                w.set_prop(propname, value)
        self.chain.handle(entity, ctxinfo)


    def prettify_escapers(self, value, popped_ansi):
        r"""Colorize special things, such as `${dollar}`."""
        if self.chain.filetype_info.escaper is None:
            return value  # No escaper was defined for this filetype...
        for unescaped, _ in self.chain.filetype_info.escaper._escape_pairs:
            if unescaped in value:
                value = value.replace(unescaped, self.ESCAPE + unescaped + popped_ansi)
        return value


    def handle_embedding(self, embedding, ctxinfo):
        r"""Colorize the `target_mwe` of an embedding based on prop "surface"."""
        import collections
        from libs.base.embedding import Embedding
        try:
            if len(embedding.target_mwe) < 2:
                ansi = swe_color_mappings.prop_ansi("surface")
            else:
                ansi = mwe_color_mappings.prop_ansi("surface")
        except KeyError:
            ansi = default_prop_ansi

        #XXX coloring context names breaks things...
        #new_embedding = Embedding.zero(tuple(
        #        self.prettify_escapers_all(embedding.target_mwe, ansi)))
        #for vecname, vec in embedding.iter_vec_items():
        #    new_vec = new_embedding.get(vecname)
        #    for context_mwe in vec.iter_contexts():
        #        new_vec.increment(tuple(
        #                self.prettify_escapers_all(context_mwe, ansi)),
        #                vec.get(context_mwe))
        new_embedding = embedding
        new_embedding.target_mwe = tuple(
                self.prettify_escapers_all(embedding.target_mwe, ansi))
        self.chain.handle_embedding(new_embedding, ctxinfo)


    def prettify_escapers_all(self, iter_values, ansi):
        r"""Yield `prettify_escapers(value)` for all values in `iter_values`."""
        for value in iter_values:
            yield ansi + self.prettify_escapers(value, ansi) + metadata_ansi


    def handle_pattern(self, pattern, ctxinfo):
        self.colorize_subpattern(pattern, ctxinfo)
        self.chain.handle_pattern(pattern, ctxinfo)


    def colorize_subpattern(self, pattern, ctxinfo):
        from libs.base import patternlib
        for subp in pattern.subpatterns:
            self.colorize_subpattern(subp, ctxinfo)

        if isinstance(pattern, patternlib.WordPattern):
            for propdict in (pattern.positive_props, pattern.negative_props):
                for propname, wordprops in dict(propdict).items():
                    for wordprop in wordprops:
                        try:
                            ansi = swe_color_mappings.prop_ansi(propname)
                        except KeyError:
                            ansi = default_prop_ansi
                        if propdict is pattern.negative_props:
                            ansi += self.NEGATIVE
                        if isinstance(wordprop, patternlib.BackrefProp):
                            wordprop.w_strid = ansi + self.prettify_escapers(
                                    wordprop.w_strid, ansi) + metadata_ansi
                            wordprop.prop = ansi + self.prettify_escapers(
                                    wordprop.prop, ansi) + metadata_ansi
                        else:
                            # All these classes have a `value` field that
                            # should be modified to add colors
                            if isinstance(wordprop, patternlib.RegexProp):
                                value = self.prettify_regex(wordprop.value, ansi)
                            elif isinstance(wordprop, patternlib.StarredWildcardProp):
                                value = wordprop.value.replace("*", self.ESCAPE + "*" + metadata_ansi)
                            elif isinstance(wordprop, patternlib.LiteralProp):
                                value = wordprop.value
                            wordprop.value = ansi + value + metadata_ansi
                    new_propname = self.prettify_escapers(propname, metadata_ansi) + metadata_ansi
                    del propdict[propname]
                    propdict[new_propname] = wordprops


    def prettify_regex(self, value, popped_ansi):
        r"""Colorize regex stuff, such as "?" or "*" or "\n"."""
        from libs.base import patternlib
        return patternlib.RegexProp.RE_REGEX_SPECIAL.sub(
                self.ESCAPE + "\\1" + popped_ansi, value)



class ColorMapping(object):
    r"""An object that represents color mappings and can
    generate the proper ANSI escape codes.
    """
    def __init__(self, initial_mapping=None):
        self.mapping = {}
        if initial_mapping:
            self.add_mapping(initial_mapping)

    def prop_ansi(self, propname):
        r"""Return ANSI escape code for given propname"""
        return ColorMapping.strings_to_ansi(self.mapping[propname])

    def empty(self):
        r"""Returns whether a mapping has been defined."""
        return not self.mapping

    def add_mapping(self, ctxinfo, string):
        r"""Add a mapping string e.g. "surface=red,bold"."""
        propname, color_attrs = string.split("=")
        color_attrs = color_attrs.split(",")
        mcm = self.mapping.setdefault(propname, [])
        for color_attr in color_attrs:
            if color_attr not in ATTR2ANSI:
                ctxinfo.error("Invalid color attribute: `{color_attr}`",
                        color_attr=color_attr)
            mcm.append(color_attr)

    @staticmethod
    def strings_to_ansi(color_attrs):
        r"""Return ANSI escape code for given color string e.g. ["red","bold"]."""
        ansi = ";".join(ATTR2ANSI[c] for c in color_attrs)
        return "\x1b[" + ansi + "m"


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """Callback function that handles the command line options of this script.
    @param opts The options parsed by getopts. Ignored.
    @param arg The argument list parsed by getopts.
    @param n_arg The number of arguments expected for this script.
    """
    global input_filetype_ext
    global output_filetype_ext
    global swe_color_mappings
    global mwe_color_mappings
    global default_prop_ansi
    global metadata_ansi

    swe_color_mappings = ColorMapping()
    mwe_color_mappings = ColorMapping()
    default_prop_ansi = ColorMapping.strings_to_ansi(["darkgray"])
    metadata_ansi = ColorMapping.strings_to_ansi(["reset"])

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o == "--prop":
            swe_color_mappings.add_mapping(ctxinfo, a)
            mwe_color_mappings.add_mapping(ctxinfo, a)
        elif o == "--swe-prop":
            swe_color_mappings.add_mapping(ctxinfo, a)
        elif o == "--mwe-prop":
            mwe_color_mappings.add_mapping(ctxinfo, a)
        elif o == "--default-prop":
            default_prop_ansi = ColorMapping.strings_to_ansi(a.split(","))
        elif o == "--metadata":
            metadata_ansi = ColorMapping.strings_to_ansi(a.split(","))
        else:
            raise Exception("Bad arg " + o)

    if swe_color_mappings.empty() and mwe_color_mappings.empty():
        mwe_color_mappings.add_mapping(ctxinfo, "surface=green")

    util.pagerify()


################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "prop=", "mwe-prop=",
        "swe-prop=", "metadata=", "default-prop="]
args = util.read_options("", longopts, treat_options, -1, usage_string)
filetype.parse(args, ViewHandler(), input_filetype_ext)
