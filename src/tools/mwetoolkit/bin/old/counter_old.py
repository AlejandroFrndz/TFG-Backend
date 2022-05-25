#!/usr/bin/python
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2012 Carlos Ramisch, Vitor De Araujo
#
# counter.py is part of mwetoolkit
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
    This script calculates individual word frequencies for a given candidate 
    list in a given corpus. The corpus may be a valid corpus word index 
    generated by the `index.py` script (-i option) or it may be the World Wide 
    Web through Google's Web Search interface (-w or -u options). Yahoo's Web 
    Search interface (-y option) is not supported anymore as they shut their 
    free search API down in April 2011, just after merging with Microsoft ;-)

    For more information, call the script with no parameter and read the
    usage instructions.
"""

import sys
import xml.sax
import re

from bin.libs.xmlhandler.genericXMLHandler import GenericXMLHandler
from xmlhandler.classes.frequency import Frequency
from xmlhandler.classes.googleFreq import GoogleFreq
from bin.libs.base.googleFreqUniv import GoogleFreqUniv
from xmlhandler.classes.corpus_size import CorpusSize


#from xmlhandler.base.corpus import Corpus
#from xmlhandler.base.suffix_array import SuffixArray
from util import usage, read_options, treat_options_simplest, verbose

from libs.indexlib import Index, ATTRIBUTE_SEPARATOR

################################################################################
# GLOBALS    
    
usage_string = """Usage: 
    
python %(program)s [-w | -u <id> | -i <corpus.index>] OPTIONS <candidates.xml>

-i <index> OR --index <index>
    Base name for the index files, as created by "index.py -i <index>".
    These files are used to calculate the frequencies of individual words
    in the corpus.

-y OR --yahoo
    Search for frequencies in the Web using Yahoo Web Search as approximator for
    Web document frequencies.
    ** THIS OPTION IS DEPRECATED AS YAHOO SHUT DOWN THEIR FREE SEARCH API **    
    
-w OR --google
    Search for frequencies in the Web using Google Web Search as approximator 
    for Web document frequencies.
    
-u <id> OR --univ <id>
    Same as -w (Google frequencies) but uses Google University Research program
    URL and ID. The ID must be registered with a static IP address at:
    http://research.google.com/university/search/
    
OPTIONS may be:

-g OR --ignore-pos
     Ignores Part-Of-Speech when counting candidate occurences. This means, for
     example, that "like" as a preposition and "like" as a verb will be counted 
     as the same entity. If you are using -w or -u, this option will be ignored. 
     Default false.

-s OR --surface
    Counts surface forms instead of lemmas. Default false.

-v OR --verbose
    Print messages that explain what is happening.
    
-x OR --text
    Instead of traditional candidates in XML, takes as input a textual list with 
    one query per line. The output will have the query followed by the number of 
    web occurrences. MUST be used with -u or -w option.
   
-a OR --vars
    Instead of counting the candidate, counts the variances in the <vars> 
    element. If you also want to count the candidate lemma, you should call the
    counter twice, first without this option then with this option.

-l OR --lang
    Language filter for web corpora (Google, Google UR). Use the 2-letter 
    language codes of the search engine. E.g. lang_pt for Portuguese, lang_en
    for English in Google UR.

-J OR --no-joint
   Do not count joint ngram frequencies; count only individual word frequencies.
    
    The <candidates.xml> file must be valid XML (mwetoolkit-candidates.dtd).
You must choose exactly one of -u, -w or -i. More than one is not allowed at
the same time. 
"""    

index = None         # Index()
suffix_array = None  # SuffixArray()

get_freq_function = None
freq_name = "?"
web_freq = None
the_corpus_size = -1
entity_counter = 0
low_limit = -1
up_limit = -1
text_input = False
count_vars = False
count_joint_frequency = True
language = DEFAULT_LANG

################################################################################
       
def treat_meta( meta ) :
    """
        Adds a `CorpusSize` meta-information to the header and prints the 
        header. The corpus size is important to allow the calculation of 
        statistical Association Measures by the `feat_association.py` script.
        
        @param meta The `Meta` header that is being read from the XML file.        
    """
    global freq_name, the_corpus_size
    meta.add_corpus_size( CorpusSize( name=freq_name, value=the_corpus_size ) )
    print meta.to_xml()
       
################################################################################

def append_counters( ngram ):
    """
        Calls the frequency function for each word of the n-gram as well as for
        the n-gram as a whole. The result is appended to the frequency list
        of the `Ngram` given as input.
        
        @param ngram The `Ngram` that is being counted.
    """
    global get_freq_function, freq_name
    ( c_surfaces, c_lemmas, c_pos ) = ( [], [], [] )
    for w in ngram :
        c_surfaces.append( w.surface )
        c_lemmas.append( w.lemma )
        c_pos.append( w.pos )
        freq_value = get_freq_function( [ w.surface.strip() ], 
                                        [ w.lemma.strip() ], 
                                        [ w.pos.strip() ] )
        w.add_frequency( Frequency( freq_name, freq_value ) )
    # Global frequency
    if count_joint_frequency:
        freq_value = get_freq_function( c_surfaces, c_lemmas, c_pos )
        ngram.add_frequency( Frequency( freq_name, freq_value ) )

################################################################################

def treat_entity( entity ) :
    """
        For each entity, searches for the individual word frequencies of the
        base ngram. The corresponding function, for a corpus index or for yahoo,
        will be called, depending on the -i or -w/-u options. The frequencies 
        are added as a child element of the word and then the candidate is 
        printed.
        
        @param candidate The `Candidate` that is being read from the XML file.        
    """
    global entity_counter
    global low_limit, up_limit
    global count_vars
    if entity_counter % 100 == 0 :
        verbose( "Processing ngram number %(n)d" % { "n":entity_counter } )
    if ( entity_counter >= low_limit or low_limit < 0 ) and \
       ( entity_counter <= up_limit or up_limit < 0 ) :
        if count_vars :
            for var in entity.vars :
                append_counters( var )
        else :
            append_counters( entity )
    print entity.to_xml().encode( 'utf-8' )
    entity_counter += 1

################################################################################
       
def compare_ngram_index( corpus, pos, ngram_ids ) :
    """
        returns 1 if ngram(pos1) >lex ngram(pos), -1 for ngram(pos1) <lex
        ngram(pos) and 0 for matching ngrams
    """   
    pos1_cursor = pos
    wordp1 = corpus[ pos1_cursor ]
    pos2_cursor = 0 
    wordp2 = ngram_ids[ pos2_cursor ] 
    
    while wordp1 == wordp2 and pos2_cursor < len( ngram_ids ) - 1:
        # both are zero, we can stop because they are considered identical
        if wordp1 == 0 :
            break                
        pos1_cursor += 1   
        wordp1 = corpus[ pos1_cursor ]
        pos2_cursor += 1   
        wordp2 = ngram_ids[ pos2_cursor ]             
    return wordp1 - wordp2      

################################################################################

def binary_search( ng_ids, sufarray, corpus, gt_fct ) :
    """
    """
    i_low = 0
    i_up = len( sufarray )
    i_mid = ( i_up + i_low ) / 2
    while i_up - i_low > 1 :                              
        if gt_fct( compare_ngram_index( corpus, sufarray[i_mid], ng_ids ), 0 ) :
            i_up = i_mid
        else :
            i_low = i_mid
        i_mid = ( i_up + i_low ) / 2
    return i_mid
    
################################################################################     
       
def get_freq_index( surfaces, lemmas, pos ) :
    """
        Gets the frequency (number of occurrences) of a token (word) in the
        index file. Calling this function assumes that you called the script
        with the -i option and with a valid index file.
        
        @param token A string corresponding to the surface form or lemma
        of a word.
        
        @param pos A string corresponding to the Part Of Speech of a word.
    """
    global build_entry, suffix_array
    ngram_ids = []
    #pdb.set_trace()
    for i in range( len( surfaces ) ) :
        word = build_entry( surfaces[i], lemmas[i], pos[i] ).decode('utf-8') #### FIXME
        wordid = suffix_array.symbols.symbol_to_number.get(word, None)
        if wordid:
            ngram_ids.append( wordid )
        else:
            return 0

    #i_last = binary_search( ng_ids, ngrams_file, corpus_file, lambda a, b: a > b )
    #i_first = binary_search( ng_ids, ngrams_file, corpus_file, lambda a, b: a >= b ) 
    indexrange = suffix_array.find_ngram_range(ngram_ids)
    if indexrange is not None:
        first, last = indexrange
        return last - first + 1
    else:
        return 0
    
################################################################################

def get_freq_web( surfaces, lemmas, pos ) : 
    """
        Gets the frequency (number of occurrences) of a token (word) in the
        Web through Yahoo's or Google's index. Calling this function assumes 
        that you called the script with the -u or -w option.
        
        @param token A list corresponding to the surface forms or lemmas of a
        word.
        
        @param pos A list corresponding to the Part Of Speeches of a word. This
        parameter is ignored since Web search engines dos no provide linguistic 
        information.
    """
    # POS is ignored
    global web_freq, build_entry, language
    search_term = ""    
    for i in range( len( surfaces ) ) :
        search_term = search_term + build_entry( surfaces[ i ], lemmas[i], pos[ i ] ) + " "   
    return web_freq.search_frequency( search_term.strip(), language )


################################################################################

def open_index( prefix ) :
    """
        Open the index files (valid index created by the `index3.py` script). 
                
        @param index_filename The string name of the index file.
    """
    global freq_name, the_corpus_size
    global index, suffix_array
    try :      
        verbose( "Loading index files... this may take some time." )
        index = Index(prefix)
        index.load_metadata()
        freq_name = re.sub( ".*/", "", prefix )
        #pdb.set_trace()
        the_corpus_size = index.metadata["corpus_size"]
    except IOError :        
        print >> sys.stderr, "Error opening the index."
        print >> sys.stderr, "Try again with another index filename."
        sys.exit( 2 )
    except KeyError :        
        print >> sys.stderr, "Error opening the index."
        print >> sys.stderr, "Try again with another index filename."
        sys.exit( 2 )        

################################################################################

def treat_text( stream ):
    """
        Treats a text file by getting the frequency of the lines. Useful for 
        quick web queries from a text file containing one query per line.
        
        @param stream File or stdin from which the lines (queries) are read.
    """
    global web_freq
    for line in stream.readlines() :
        query = line.strip()
        #pdb.set_trace()
        count = str( web_freq.search_frequency( query ) )
        print query + "\t" + count

################################################################################

def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.
        
        @param opts The options parsed by getopts. Ignored.
        
        @param arg The argument list parsed by getopts.
        
        @param n_arg The number of arguments expected for this script.    
    """
    global cache_file, get_freq_function, build_entry, web_freq
    global the_corpus_size, freq_name
    global low_limit, up_limit
    global text_input, count_vars
    global language
    global suffix_array
    global count_joint_frequency
    surface_flag = False
    ignorepos_flag = False
    mode = []
    for ( o, a ) in opts:
        if o in ( "-i", "--index" ) : 
            open_index( a )
            get_freq_function = get_freq_index
            mode.append( "index" )              
        elif o in ( "-y", "--yahoo" ) :
            print >> sys.stderr, "THIS OPTION IS DEPRECATED AS YAHOO " + \
                                 "SHUT DOWN THEIR FREE SEARCH API"
            sys.exit( 3 )
            #web_freq = YahooFreq()          
            #freq_name = "yahoo"
            #ignorepos_flag = True 
            #the_corpus_size = web_freq.corpus_size()         
            #get_freq_function = get_freq_web
            #mode.append( "yahoo" )   
        elif o in ( "-w", "--google" ) :
            web_freq = GoogleFreq()          
            freq_name = "google"
            ignorepos_flag = True 
            the_corpus_size = web_freq.corpus_size()         
            get_freq_function = get_freq_web
            mode.append( "google" ) 
        elif o in ( "-u", "--univ" ) :
            web_freq = GoogleFreqUniv( a )          
            freq_name = "google"
            ignorepos_flag = True 
            the_corpus_size = web_freq.corpus_size()         
            get_freq_function = get_freq_web
            mode.append( "google" )             
        elif o in ("-s", "--surface" ) :
            surface_flag = True
        elif o in ("-g", "--ignore-pos"): 
            ignorepos_flag = True
        elif o in ("-f", "--from", "-t", "--to" ) :
            try :
                limit = int(a)
                if limit < 0 :
                    raise ValueError, "Argument of " + o + " must be positive"
                if o in ( "-f", "--from" ) :
                    if up_limit == -1 or up_limit >= limit :
                        low_limit = limit
                    else :
                        raise ValueError, "Argument of -f >= argument of -t"
                else :
                    if low_limit == -1 or low_limit <= limit :
                        up_limit = limit
                    else :
                        raise ValueError, "Argument of -t <= argument of -t"
            except ValueError, message :
                print >> sys.stderr, message
                print >> sys.stderr, "Argument of " + o + " must be integer"
                usage( usage_string )
                sys.exit( 2 )
        elif o in ("-x", "--text" ) : 
            text_input = True
        elif o in ("-a", "--vars" ) : 
            count_vars = True
        elif o in ("-l", "--lang" ) : 
            language = a
        elif o in ("-J", "--no-joint") :
        	count_joint_frequency = False

    if mode == [ "index" ] :       
        if surface_flag and ignorepos_flag :
            #build_entry = lambda s, l, p: (s + SEPARATOR + WILDCARD).encode('utf-8')
            build_entry = lambda s, l, p: (s).encode('utf-8')
            suffix_array = index.load("surface")
        elif surface_flag :
            #build_entry = lambda s, l, p: (s + SEPARATOR + p).encode('utf-8')
            build_entry = lambda s, l, p: (s + ATTRIBUTE_SEPARATOR + p).encode('utf-8')
            suffix_array = index.load("surface+pos")
        elif ignorepos_flag :
            #build_entry = lambda s, l, p: (l + SEPARATOR + WILDCARD).encode('utf-8')
            build_entry = lambda s, l, p: (l).encode('utf-8')
            suffix_array = index.load("lemma")
        else :      
            build_entry = lambda s, l, p: (l + ATTRIBUTE_SEPARATOR + p).encode('utf-8')
            suffix_array = index.load("lemma+pos")

    else : # Web search, entries are single surface or lemma forms         
        if surface_flag :
            build_entry = lambda s, l, p: s.encode('utf-8')
        else :
            build_entry = lambda s, l, p: l.encode('utf-8')
        
    if len(mode) != 1 :
        print >> sys.stderr, "Exactly one option -u, -w or -i, must be provided"
        usage( usage_string )
        sys.exit( 2 )
    elif text_input and web_freq is None :
        print >> sys.stderr, "-x option MUST be used with either -u or -w"
        usage( usage_string )
        sys.exit( 2 )
        
                
    treat_options_simplest( opts, arg, n_arg, usage_string )

################################################################################
# MAIN SCRIPT

longopts = ["yahoo", "google", "index=", "verbose", "ignore-pos", "surface",\
            "from=", "to=", "text", "vars", "lang=", "no-joint", "univ=" ]
arg = read_options( "ywi:vgsf:t:xal:Ju:", longopts, treat_options, -1, usage_string )

try : 
    parser = xml.sax.make_parser()
    handler = GenericXMLHandler( treat_meta=treat_meta,
                                 treat_entity=treat_entity,
                                 gen_xml=True )
    parser.setContentHandler( handler )
    verbose( "Counting ngrams in candidates file" )
    if len( arg ) == 0 :
        if text_input :
            treat_text( sys.stdin )
        else :
            parser.parse( sys.stdin )
            print handler.footer
    else :
        for a in arg :
            input_file = open( a )
            if text_input :
                treat_text( input_file )
            else :
                parser.parse( input_file )
                footer = handler.footer
                handler.gen_xml = False
            input_file.close()
            entity_counter = 0
        if not text_input :
            print footer   
            
except IOError, err :
    print >> sys.stderr, err
    sys.exit(1)
except Exception, err :
    print >> sys.stderr, err
    print >> sys.stderr, "You probably provided an invalid candidates file," + \
                         " please validate it against the DTD " + \
                         "(dtd/mwetoolkit-candidates.dtd)"
    sys.exit(1)
finally :
    if web_freq :
        web_freq.flush_cache() # VERY IMPORTANT!
