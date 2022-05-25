#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2015 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# feat_entropy.py is part of mwetoolkit
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
    This script adds entropy fetures based on a number of variations. It may
    only be called with candidate files containing <vars> elements. The way
    entropy is calculated can be changed through the command line options.
    
    For more information, call the script with no parameter and read the
    usage instructions.
"""


import math
import operator

from libs.base.feature import Feature
from libs.base.meta_feat import MetaFeat
from libs import util
from libs import filetype
from functools import reduce



################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} OPTIONS <candidates>
Read a MWE lexicon annotated with <vars> elements (XML format).
Output MWE lexicon with an "entropy" feature.

The <candidates> input file must be in one of the filetype
formats accepted by the `--from` switch.

OPTIONS may be:

--from <input-filetype-ext>
    Force reading from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--to <output-filetype-ext>
    Write output in given filetype extension.
    (By default, keeps original input format):
    {descriptions.output[candidates]}

{common_options}
"""     
input_filetype_ext = None
output_filetype_ext = None

all_patterns = {}

     
################################################################################
       
def entropy( probabilities ) :
    """
        Given a list of probabilities, calculates the entropy as -sum(p*log(p))
    """
    ent = 0
    #pdb.set_trace()
    for p in probabilities :
        if p != 0 :
            ent = ent - p * math.log( p )
    return ent

################################################################################

def probs_from_varfreqs( varfreqs ) :
    """
       Gives the a list of probabilities as the relative frequency of each
       variation, i.e. generates a percent list from an absolute count list.
    """
    probabilities = []
    sum_vf = 0.0
    for vf in varfreqs :
        sum_vf = sum_vf + vf
    if sum_vf != 0 :
        for vf in varfreqs :
            probabilities.append( vf / sum_vf )
    return probabilities

################################################################################

def probs_weighted( varfreqs, weights ) :
    """
        Gives the list of probabilities but considers a weight in the
        calculation, which is going to be divided by each probability 
        frequency. Each frequency must have a weight, i.e. the inputs must
        have the same number of elements.
    """
    probabilities = []
    sum_vf = 0.0
    #pdb.set_trace()
    for vfi in range(len(varfreqs)) : 
        if weights[ vfi ] != 0 :        
            sum_vf = sum_vf + ( varfreqs[ vfi ] /
                     float( reduce( operator.mul, weights[ vfi ] ) ) )
    if sum_vf != 0 :       
        for vfi in range(len(varfreqs)) :
            probabilities.append( ( varfreqs[ vfi ] /
            float( reduce( operator.mul, weights[ vfi ] ) ) ) / sum_vf )
    return probabilities
       
################################################################################

def append_list_dict( dictionary, key, value ) :
    """
        Appends a value to the list in position key of the dictionary d
    """
    a_list = dictionary.get( key, [] )
    a_list.append( value )
    dictionary[ key ] = a_list        


################################################################################

class FeatGeneratorHandler(filetype.ChainedInputHandler):
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)

    def handle_meta(self, meta, ctxinfo):
        """
            Adds two new meta-features corresponding to the features that we add to
            each candidate. The meta-features define the type of the features, which
            is an enumeration of all possible POS patterns for the POS pattern and
            an integer number for the size n of the candidate.
            
            @param meta The `Meta` header that is being read from the XML file.        
        """
        global all_patterns
        pattern_feat_values = "{"
        for corpus_size in meta.corpus_sizes :
            meta.add_meta_feat( MetaFeat( "entropy_" + corpus_size.name, "real" ) )        
        self.chain.handle_meta(meta, ctxinfo)


    def handle_candidate(self, candidate, ctxinfo):
        """
            XXX
            
            @param candidate The `Candidate` that is being read from the XML file.
        """
        pattern = candidate.get_pos_pattern()
        #pdb.set_trace()
        freq_table = {}
        verb_table = {} # verb fixed, compl varies
        compl_table = {} # compl fixed, verb varies
        #pdb.set_trace()
        # Workaround to count both determiners
        f_a = candidate[ 1 ].get_freq_value( "bnc" ) + 1
        f_the = candidate[ 2 ].get_freq_value( "bnc" ) + 1
        f_det = f_a + f_the
        verb = candidate[ 0 ].lemma
        compl = candidate[ 3 ].lemma
        for variation in candidate.vars :
            for freq in variation.freqs :
                var_verb = variation[ 0 ].lemma            
                freq_verb = variation[ 0 ].get_freq_value("bnc") + 1
                var_compl = variation[ 2 ].lemma
                freq_compl = variation[ 2 ].get_freq_value("bnc") + 1
                f_entry = (freq.value, freq_verb, f_det, freq_compl )
                append_list_dict( freq_table, freq.name, f_entry )
                if verb == var_verb :
                    append_list_dict( verb_table, freq.name, f_entry )
                if compl == var_compl :
                    append_list_dict( compl_table, freq.name, f_entry )                   

        verb_table[ "google" ].sort( key=operator.itemgetter(3), reverse=True )
        verb_table["google"] = verb_table["google"][ 0:5 ]
        compl_table[ "google" ].sort( key=operator.itemgetter(1), reverse=True )
        compl_table["google"] = compl_table["google"][ 0:5 ]
        ent = entropy( probs_from_varfreqs( list(map( operator.itemgetter(0),
                       freq_table["google"] )) ) )
        ent_w = entropy( probs_weighted( list(map( operator.itemgetter(0),
                         freq_table["google"] )), list(map( operator.itemgetter(1,2,3),
                         freq_table["google"] )) ) )
        ent_w_verb = entropy( probs_weighted( list(map( operator.itemgetter(0),
                              compl_table["google"] )),
                              list(map( operator.itemgetter(1,2,3),
                              compl_table["google"] )) ) )
        ent_w_compl = entropy( probs_weighted( list(map( operator.itemgetter(0),
                               verb_table["google"] )),
                               list(map( operator.itemgetter(1,2,3),
                               verb_table["google"] )) ) )    
        candidate.add_feat( Feature( "entropy_google", str( ent ) ) )
        candidate.add_feat( Feature( "entropy_w_google", str( ent_w ) ) )
        candidate.add_feat( Feature( "entropy_w_verb_google", str( ent_w_verb ) ) )    
        candidate.add_feat( Feature( "entropy_w__compl_google", str( ent_w_compl )))    
        self.chain.handle_candidate(candidate, ctxinfo)


################################################################################
def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.

        @param opts The options parsed by getopts. Ignored.

        @param arg The argument list parsed by getopts.

        @param n_arg The number of arguments expected for this script.
    """     
    global input_filetype_ext
    global output_filetype_ext
    
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):        
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a    
        else:
            assert False, o
    
        
################################################################################
# MAIN SCRIPT
longopts = ["from=","to="]
args = util.read_options( "", longopts, treat_options, -1, usage_string )
filetype.parse(args, FeatGeneratorHandler(), input_filetype_ext)
