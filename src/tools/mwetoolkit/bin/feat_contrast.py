#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2015 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# feat_contrast.py is part of mwetoolkit
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
    This script adds a new feature which is the contrastive score of a frequency
    compared to another "contrastive" corpus. The idea is to filter 
    out-of-domain candidate MWEs out of the data.
    
    For more information, call the script with no parameter and read the
    usage instructions.
"""


import math

from libs.base.feature import Feature
from libs.base.meta_feat import MetaFeat
from libs import util
from libs import filetype


################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} -o <name> OPTIONS <candidates>
Read a MWE lexicon annotated with frequency from multiple sources.
Output MWE lexicon with a "contrast" score.

-o <name> OR --original <name>
    The name of the frequency source from which the candidates were extracted
    originally. This is only necessary because all other frequency sources will
    be considered as contrastive corpora. You may choose if you'd like to have 
    one feature per contrastive corpus or a single feature for all the 
    contrastive corpora as in the original formulation of the measure.

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

-m <meas> OR --measures <meas>
    The name of the measures that will be calculated. If this option is not
    defined, the script calculates all available measures. Measure names should
    be separated by colon ":" and should be in the list of supported measures
    below:
    * "csmwe": Original measure proposed by Bonin et al. 2010
    * "simplecsmwe": Simplified rank-equivalent version of the previous
    * "simplediff": Simply divides the original frequency by contrastive frequency

-a OR --all
    Join all contrastive corpora and consider it as a single corpus. The default
    behaviour of this script is to calculate one contrastive score per
    contrastive corpora.

{common_options}
"""
input_filetype_ext = None
output_filetype_ext = None

supported_measures = [ "csmwe", "simplediff", "simplecsmwe" ]
corpussize_dict = {}
totals_dict = {}
measures = supported_measures
# TODO: Parametrable combine function
# heuristic_combine = lambda l : sum( l ) / len( l ) # Arithmetic mean
join_all_contrastive=False
main_freq_name = None


################################################################################     

class MeasureCalculatorHandler(filetype.ChainedInputHandler):
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)

    def handle_meta(self, meta, ctxinfo):
        """
            Adds new meta-features corresponding to the features that we add to
            each candidate. The meta-features define the type of the features, which
            is a real number for each of the contrastive measures in each corpus.
            
            @param meta The `Meta` header that is being read from the XML file.       
        """
        global corpussize_dict
        global measures
        global main_freq_name
        for corpus_size in meta.corpus_sizes :
            corpussize_dict[ corpus_size.name ] = float(corpus_size.value)
        for corpus_size in meta.corpus_sizes :
            if corpus_size.name != main_freq_name :
                for meas in measures :
                    meta.add_meta_feat(MetaFeat( meas+ "_" +corpus_size.name, "real" ))
        self.chain.handle_meta(meta, ctxinfo)


    def handle_candidate(self, candidate, ctxinfo):
        """
            For each candidate and for each `CorpusSize` read from the `Meta` 
            header, generates features that correspond to the Contrastive
            Measures described above.
            
            @param candidate The `Candidate` that is being read from the XML file.    
        """
        global corpussize_dict
        global totals_dict
        global main_freq_name
        # get the original corpus freq, store the others in contrastive corpus dict
        # We use plus one smoothing to avoid dealing with zero freqs    
        contrast_freqs = {}
        if join_all_contrastive :
            contrast_freqs[ "all" ] = 1
        main_freq = None
        for freq in candidate.freqs :
            if freq.name == main_freq_name :
                main_freq = float( freq.value ) + 1 
            elif join_all_contrastive :
                contrast_freqs[ "all" ] += float( freq.value )
            else :
                contrast_freqs[ freq.name ] = float( freq.value ) + 1
        
        for contrast_name in list(contrast_freqs.keys()) :                    
            try :            
                feats = calculate_indiv( corpussize_dict[ main_freq_name ],
                                         corpussize_dict[ contrast_name ],
                                         main_freq, 
                                         contrast_freqs[ contrast_name ], 
                                         totals_dict[ contrast_name ],                                      
                                         contrast_name )
                for feat in feats :
                    candidate.add_feat( feat )
            except Exception :
                ctxinfo.error("Error in calculating the measures.")
        self.chain.handle_candidate(candidate, ctxinfo)


################################################################################

class TotalCalculatorHandler(filetype.InputHandler):
    def handle_meta(self, meta, ctxinfo):
        """
            Reads the `corpus_size` meta header and initializes a global counter
            dictionary with zero for each corpus. This dict will contain the total
            number of candidate frequencies summed up, as in the csmwe original
            formulation.
        
            @param meta The `Meta` header that is being read from the XML file.          
        """
        global totals_dict, main_freq_name
        main_freq_valid = False    
        for corpus_size in meta.corpus_sizes :
            totals_dict[ corpus_size.name ] = 0
            if corpus_size.name == main_freq_name :
                main_freq_valid = True    
        if not main_freq_valid :
            ctxinfo.error("main frequency must be a valid freq. name" \
                    "\nPossible values: {values}", values=list(totals_dict.keys()))
          

    def handle_candidate(self, candidate, ctxinfo):
        """
            For each candidate and for each `CorpusSize` read from the `Meta` 
            header, generates four features that correspond to the Association
            Measures described above.
            
            @param candidate The `Candidate` that is being read from the XML file.    
        """
        global totals_dict
        for freq in candidate.freqs :
            totals_dict[ freq.name ] += freq.value
               
################################################################################     
       

def calculate_indiv( n_main, n_cont, main_freq, 
                     contrast_freq, total_freq, corpus_name ) :
    """
        Calculates the contrastive measures for an individual candidate.
        
    """
    global measures
    feats = []
    if "csmwe" in measures :
        k = math.log( main_freq, 2 )
        x = main_freq / ( contrast_freq / total_freq )
        csmwe = math.atan( k * x )
        feats.append( Feature( "csmwe_" + corpus_name, csmwe ) )
    if "simplediff" in measures :
        simplediff = main_freq / contrast_freq
        feats.append( Feature( "simplediff_" + corpus_name, simplediff ) )
    if "simplecsmwe" in measures :
        simplecsmwe = math.log( main_freq, 2 ) * ( main_freq / contrast_freq )
        feats.append( Feature( "simplecsmwe_" + corpus_name, simplecsmwe ) )            
    return feats


################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.

        @param opts The options parsed by getopts. Ignored.

        @param arg The argument list parsed by getopts.

        @param n_arg The number of arguments expected for this script.
    """
    global measures
    global supported_measures
    global main_freq_name
    global join_all_contrastive    
    global input_filetype_ext
    global output_filetype_ext
    
    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ( "-m", "--measures" ) :
            measures = ctxinfo.parse_list(a, ":", supported_measures)
        elif o in ( "-o", "--original" ) :
            main_freq_name = a
        elif o in ( "-a", "--all" ) :
            join_all_contrastive = True
        elif o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a    
        else:
            assert False, o
    
    if not main_freq_name :
        ctxinfo.error("Option -o is mandatory")


################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "measures=", "original=", "all"]
args = util.read_options( "m:o:a", longopts, treat_options, 1, usage_string )

for a in args :
    util.verbose( "Pass 1 for " + a )
    filetype.parse([a], TotalCalculatorHandler(), input_filetype_ext)
    # First calculate Nc for each contrastive corpus        
    util.verbose( "Pass 2 for " + a )    
    filetype.parse([a], MeasureCalculatorHandler(), input_filetype_ext)
