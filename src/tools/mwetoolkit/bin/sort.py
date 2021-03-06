#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

# ###############################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# sort.py is part of mwetoolkit
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
    This script sorts the candidate list according to the value of a feature (or
    the values of some features) that is/are called key feature(s). The key is
    used to sort the candidates in descending order (except if explicitly asked
    to sort in ascending order). Sorting is stable, i.e. if two candidates have
    the same key feature values, their relative order will be preserved in the
    output.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import locale

from libs import util
from libs import filetype

locale.setlocale(locale.LC_ALL, 'C')


###############################################################################
# GLOBALS

usage_string = """\
Usage: {progname} [OPTIONS] -f <feat> <candidates>
Sort MWE lexicon according to specified feature.

-f <feat> OR --feat <feat>
    A colon-separated list of features that will be used to sort the
    candidates.  For candidates whose sorting feature is not present, the
    script assumes the default UNKNOWN_FEAT_VALUE, which is represented by a
    question mark "?".

    Pseudo-features:
    * "@LEMMA": Lexicographic sort based on word lemmas.
    * "@SURFACE": Lexicographic sort based on word surfaces.
    * "@POS": Lexicographic sort based on word POS-tags.
    By default, if no features are defined, "@LEMMA:@SURFACE:@POS" is used.

The <candidates> input file must be in one of the filetype
formats accepted by the `--from` switch.


OPTIONS may be:

-a OR --asc
    Sort in ascending order (default).

-d OR --desc
    Sort in descending order. By default, classification is ascending.

--from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, keeps input in original format):
    {descriptions.output[candidates]}

{common_options}
"""

PSEUDO_FEATS = ["@LEMMA", "@SURFACE", "@POS"]

feat_list = ["@LEMMA", "@SURFACE", "@POS"]
ascending = True

input_filetype_ext = None
output_filetype_ext = None


################################################################################     

class SorterHandler(filetype.ChainedInputHandler):

    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
            self.all_entities = {}
        self.chain.before_file(fileobj, ctxinfo)
        self.feat_list_ok = False
        self.all_feats = list(PSEUDO_FEATS)
        self.feat_to_order = []

    def handle_meta(self, meta, ctxinfo):
        """
            Treats the meta information of the file. Besides of printing the meta
            header out, it also keeps track of all the meta-features. The list of
            `all_feats` will be used in order to verify that all key features have a
            valid meta-feature. This is important because we need to determine the
            correct type of the feature value, since it might influence sorting 
            order (e.g. integers 1 < 2 < 10 but strings "1" < "10" < "2")
            
            @param meta The `Meta` header that is being read from the XML file.         
        """
        for meta_feat in meta.meta_feats:
            self.all_feats.append(meta_feat.name)
        self.chain.handle_meta(meta, ctxinfo)


    def _fallback_entity(self, entity, ctxinfo):
        """
            For each entity, stores it in a temporary Database (so that it can be
            retrieved later) and also creates a tuple containing the sorting key
            feature values and the entity ID. All the tuples are stored in a
            global list, that will be sorted once all candidates are read and stored
            into the temporary DB.
        """
        global feat_list
        # First, verifies if all the features defined as sorting keys are real 
        # features, by matching them against the meta-features of the header. This
        # is only performed once, before the first entity is processed
        if not self.feat_list_ok:
            for feat_name in feat_list:
                if feat_name not in self.all_feats:
                    ctxinfo.error("\"{feat}\" is not a valid feature\n" \
                            "Please chose features from the list below:\n" \
                            "{list}".format(feat=feat_name, list="\n".join(
                                    "* " + feat for feat in self.all_feats)))
            self.feat_list_ok = True

        # Store the whole entity in a temporary database
        self.all_entities[str(entity.id_number)] = (entity, ctxinfo)

        # Build up a tuple to be added to a list.
        one_tuple = []
        for feat_name in feat_list:
            one_tuple.append(self.feat_value(entity, feat_name, ctxinfo))
        # The tuple will contain the sorting key values and the
        # entity ID. The former are used to sort the candidates, the 
        # latter is used to retrieve a entity from the temporary DB
        one_tuple.append(entity.id_number)
        self.feat_to_order.append(tuple(one_tuple))


    def feat_value(self, entity, feat_name, ctxinfo):
        r"""Return value for given feature name."""
        if feat_name.startswith("@"):
            if feat_name == "@SURFACE":
                return tuple(w.surface for w in entity)
            if feat_name == "@LEMMA":
                return tuple(w.lemma for w in entity)
            if feat_name == "@POS":
                return tuple(w.pos for w in entity)
            ctxinfo.error("Bad pseudo-feature name", feat_name=feat_name)
        return entity.get_feat_value(feat_name)


    def after_file(self, fileobj, ctxinfo):
        """Sorts the tuple list `self.feat_to_order` and then retrieves the
        candidates from the temporary DB in order to print them out."""
        global ascending
        # Sorts the tuple list ignoring the last entry, i.e. the candidate ID
        # If I didn't ignore the last entry, the algorithm wouldn't be stable.
        # If the user didn't ask "-d" explicitly, sorting is ascending
        self.feat_to_order.sort(key=lambda x: x[0:len(x) - 1], reverse=(not ascending))
        # Now print sorted candidates. A candidate is retrieved from temp DB through
        # its ID
        for feat_entry in self.feat_to_order:
            x = feat_entry[len(feat_entry) - 1]
            entity, ctxinfo = self.all_entities[str(x)]
            self.chain.handle(entity, ctxinfo)
        self.chain.after_file(fileobj, ctxinfo)


################################################################################

def treat_feat_list(feat_string):
    """
        Parses the option of the "-f" option. This option is of the form 
        "<feat1>:<feat2>:<feat3>" and so on, i.e. feature names separated by
        colons.
        
        @param feat_string String argument of the -f option, has the form
        "<feat1>:<feat2>:<feat3>"
        
        @return A list of strings containing the (unverified) key feature names.
    """
    if feat_string == "":
        return []  # Python splits as [""]... ????
    return feat_string.split(":")


################################################################################

def treat_options(opts, arg, n_arg, usage_string):
    """
        Callback function that handles the command line options of this script.
        
        @param opts The options parsed by getopts. Ignored.
        
        @param arg The argument list parsed by getopts.
        
        @param n_arg The number of arguments expected for this script.    
    """
    global feat_list
    global ascending
    global input_filetype_ext
    global output_filetype_ext

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-f", "--feat"):
            feat_list = treat_feat_list(a)
        elif o in ("-a", "--asc"):
            ascending = True
        elif o in ("-d", "--desc"):
            ascending = False
        elif o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        else:
            raise Exception("Bad arg")


################################################################################     
# MAIN SCRIPT

longopts = ["from=", "to=", "feat=", "asc", "desc"]
args = util.read_options("f:ad", longopts, treat_options, -1, usage_string)
filetype.parse(args, SorterHandler(), input_filetype_ext)
