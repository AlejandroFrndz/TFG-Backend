#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2015 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# feat_pattern.py is part of mwetoolkit
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
    This script adds two new features for each candidate in the list. These two
    features correspond to the POS pattern and to the number of words in the
    candidate base form. The former is the sequence of Part Of Speech tags in
    the candidate, for example, a sequence of Nouns or Adjectives. The latter is
    the value of n in the ngram that describes the base for of the candidate.
    
    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs.base.feature import Feature
from libs.base.meta_feat import MetaFeat
from libs import util
from libs.base.word import SEPARATOR
from libs import filetype

     
################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} OPTIONS <candidates>
Read MWE lexicon.
Output MWE lexicon with 3 surface features: POS sequence, n-gram length, case

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

class RecovererHandler(filetype.InputHandler):
    def handle_candidate(self, candidate, ctxinfo):
        """
            Simply stores the candidate's POS pattern into a dictionary. This allows
            us to know what are all the different possible values for this feature.
            
            @param candidate The `Candidate` that is being read from the XML file.
        """
        global all_patterns
        pattern = candidate.get_pos_pattern().replace( SEPARATOR, "-" )
        all_patterns[ pattern ] = 1    


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
        for pattern_value in list(all_patterns.keys()) :
            pattern_feat_values = pattern_feat_values + pattern_value + ","
        pattern_feat_values = pattern_feat_values[0:len(pattern_feat_values) - 1] 
        pattern_feat_values = pattern_feat_values + "}"    
        meta.add_meta_feat( MetaFeat( "pos_pattern", pattern_feat_values ) ) 
        meta.add_meta_feat( MetaFeat( "n", "integer" ) )
        meta.add_meta_feat( MetaFeat( "capitalized", "{UPPERCASE,Firstupper,lowercase,MiXeD}" ) )    
        meta.add_meta_feat( MetaFeat( "hyphen", "{True,False}" ) )        
        self.chain.handle_meta(meta, ctxinfo)


    def handle_candidate(self, candidate, ctxinfo):
        """
            For each candidate, generates two new features that correspond to the
            POS pattern and to the number of words in the candidate. Then, prints
            the new candidate with the two extra features.
            
            @param candidate The `Candidate` that is being read from the XML file.
        """
        pattern = candidate.get_pos_pattern().replace( SEPARATOR, "-" )
        candidate.add_feat( Feature( "pos_pattern", pattern ) )
        candidate.add_feat( Feature( "n", len( candidate ) ) )
        case_classes = {}
        #pdb.set_trace()
        has_hyphen = False
        for w in candidate :
            case_class = w.get_case_class()
            count_class = case_classes.get( case_class, 0 )
            case_classes[ case_class ] = count_class + 1
            has_hyphen = has_hyphen or "-" in w.lemma
        argmax_case_class = max( list(zip( list(case_classes.values()), 
                                      list(case_classes.keys()) )) )[ 1 ]
        candidate.add_feat( Feature( "capitalized", argmax_case_class ) )        
        candidate.add_feat( Feature( "hyphen", str( has_hyphen ) ) )
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

# Done in 2 passes, one to define the type of the feature and another to
# print the feature values for each candidate
util.verbose( "1st pass : recover all POS patterns for meta feature" )
# Will ignore meta information and simply recover all the possible patterns
filetype.parse(args, RecovererHandler(), input_filetype_ext)

# Second pass to print the metafeat header with all possible pattern values
util.verbose( "2nd pass : add the features" )
filetype.parse(args, FeatGeneratorHandler(), input_filetype_ext)
