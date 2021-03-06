#!/usr/bin/python
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# sentence.py is part of mwetoolkit
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
    This module provides the `Sentence` class. This class represents a sentence, 
    i.e. a sequence of words that convey a complete information, as they occur 
    in the corpus. You are expected to use this class to represent objects that
    are linguistically motivated sentences, not simply ngrams.
"""






from .ngram import Ngram



class SentenceFactory(object):
    r"""Instances of SentenceFactory can be used
    to create instances of Sentence with automatic
    definition of its `id_number` attribute.

    Call `self.make(word_list)` to create a Sentence.
    """
    FIRST_ID = 1
    def __init__(self):
        self.prev_id = self.FIRST_ID-1

    def make(self, word_list=[], **kwargs):
        r"""Calls `Sentence(word_list, ...)` to create a Sentence."""
        self.prev_id = kwargs.pop("id_number", self.prev_id+1)
        return Sentence(word_list, id_number=self.prev_id, **kwargs)


################################################################################

class Sentence( Ngram ) :
    """
        A `Sentence` is a representation of a sequence of words as they appear 
        in a given corpus (mwetoolkit-corpus.dtd). It is a subclass of `Ngram`,
        meaning that it is not more than a sequence of words, with the particu-
        larity that they are linguistic units that convey a complete 
        information and generally end with a punctuation sign. However, no test
        is performed in order to verify whether the sentence is well-formed,
        grammatically or semantically correct. This means that if you 
        append words that do not make sense to the sentence (e.g. "the of going 
        never"), it is basically your problem.
    """
    DISPATCH = "handle_sentence"
    
################################################################################

    def __init__( self, word_list, id_number ) :
        """
            Instantiates a new sentence from a list of words. A sentence has a
            list of adjacent words and an integer unique identifier. If the 
            sentence ends with a punctuation sign, it should be included as the
            last token of the list. Intermediary punctuation signs such as commas
            and parentheses should also be considered as separate tokens, please
            pay attention to correctly tokenise your corpus before using 
            mwetoolkit.
            
            @param word_list A list of `Word`s in the same order as they occur
            in the sentence in the corpus.
            
            @param id_number An integer identifier that uniquely describes the
            current sentence.
            
            @return A new instance of a `Sentence`
        """
        super(Sentence, self).__init__(word_list)
        self.id_number = id_number
        #self.freqs = None
        self.mweoccurs = []
        

################################################################################

    def sub_sentence(self, indexes, ctxinfo):
        r"""Return a Sentence instance with only the words in given indexes.
        If an element of `indexes` is an instance of `Word` it will be inserted
        in the appropriate position instead.

        @param indexes: A list of elements who are either
        -- integers (indexes of `self.word_list`); or
        -- instances of `Word`, to be inserted directly.
        """
        old2new_i = {old:new for (new, old) in enumerate(indexes)}
        ret = Sentence([self[x].copy() if isinstance(x, int) else x
                for x in indexes], self.id_number)

        for w in ret:
            syn_list = []
            for synrel, synid in w.syn_iter(ctxinfo):
                # Correct synid in synrel:synid dependency
                synid = old2new_i.get(synid, -1)
                syn_list.append((synrel, synid))
            w.syn = w.syn_encode(syn_list)

        for mweo in self.mweoccurs:
            from .mweoccur import MWEOccurrence
            try:
                new_i = [old2new_i[old_i] for old_i in mweo.indexes]
            except KeyError:
                pass  # One of the indexes was removed; remove whole MWE info
            else:
                mweo2 = MWEOccurrence(ret, mweo.candidate, new_i)
                ret.mweoccurs.append(mweo2)
        return ret
        

################################################################################

    def xwe_indexes(self):
        r"""Convenience function that yields a lists of indexes,
        one per SingleWE/MultiWE. Non-contiguous MWEs might be yielded
        in an unexpected way.  Degenerate (empty) MWEs are skipped.
        """
        ret = [[i] for i in range(len(self.word_list))]
        for mweo in self.mweoccurs:
            if mweo.indexes:
                first = min(mweo.indexes)
                for i in mweo.indexes:
                    if i != first:
                        ret[first].extend(ret[i])
                        del ret[i][:]
        return [x for x in ret if x]

################################################################################

    def xwes(self):
        r"""Convenience function that yields lists of words,
        one per SingleWE/MultiWE. See `xwe_indexes()` above.
        """
        for xwei in self.xwe_indexes():
            yield [self[i] for i in xwei]

################################################################################

    def bio_list(self, update_mweoccurs=False):
        r"""Return a BIO array for this sentence (see Schneider 2014).
        Each index value can be one of ["B", "I", "O", "b", "i", "o"].
        """
        return self.bio_mweo_lists(update_mweoccurs)[0]


    def bio_mweo_lists(self, update_mweoccurs=False):
        r"""Return a pair (self.bio_list(), new_mweoccurs)."""
        bio = ['O'] * len(self)
        def update(i, upper_val):
            r"""Update bio[i] = upper_val. May lowercase it."""
            assert bio[i] in 'Oo'
            bio[i] = (upper_val if bio[i] == 'O' else upper_val.lower())

        new_mweoccurs = []
        for mweo in self.mweoccurs:
            if len(mweo.indexes) >= 2:
                # Skip if there is index overlap
                if not all(bio[i] in 'Oo' for i in mweo.indexes): continue

                # Skip if we would be introducing a 3rd level between other two
                imin, imax = min(mweo.indexes), max(mweo.indexes)
                if any(bio[i] in 'bi' for i in range(imin,imax+1)): continue

                new_mweoccurs.append(mweo)

                # Update every index
                update(mweo.indexes[0], 'B')
                for i in mweo.indexes[1:]:
                    update(i, 'I')

                # Decrease one level for everyone inside:
                index_set = set(mweo.indexes)
                for i in range(imin, imax+1):
                    if (i not in index_set):
                        bio[i] = bio[i].lower()


        if update_mweoccurs:
            self.mweoccurs = new_mweoccurs
        return bio, new_mweoccurs


################################################################################

    def add_mwe_tags( self, tokens ) :
        """
            Given a list of tokens (words represented somehow), adds <mwepart>
            tags around them in order to indicate those words that are parts of
            identified MWEs.
            
            @param tokens A list of strings containing the sentence tokens
            @return A copy of the list of tokens with each MWE part tagged
        """
        mwetags_list = [ [] for i in range( len( tokens ) ) ]
        result = list( tokens )
        for mweoccur in self.mweoccurs :
            for i in mweoccur.indexes :
                mwetags_list[ i ].append( str(mweoccur.candidate.id_number) )
        for ( mwetag_i, mwetag ) in enumerate( mwetags_list ) :
            if mwetag : 
                result[mwetag_i] = "<%(tag)s id=\"%(ids)s\">%(w)s</%(tag)s>" % \
                {"tag":"mwepart", "ids":",".join(mwetag), "w":result[mwetag_i]}
        return result
            
################################################################################        
        
    def add_mwe_tags_html( self, tokens ) :
        """
            Given a list of tokens (words represented somehow), adds <span>
            tags around them in order to indicate those words that are parts of
            identified MWEs.

            @param tokens: A list of strings containing the sentence tokens
            @return A copy of the list of tokens with each MWE part tagged
        """
        candids = {}
        mwetags_list = [ [] for i in range( len( tokens ) ) ]
        result = list( tokens )
        for mweoccur in self.mweoccurs :
            for i in mweoccur.indexes :
                candids[ mweoccur.candidate ] = "X" # Check, no repet
                mwetags_list[ i ].append( mweoccur.candidate )
        # Number the mwes in a sequence, 1, 2, 3...
        for i, mweoccur in enumerate(self.mweoccurs):
            candids[mweoccur.candidate] = "mwe" + str(i + 1)
        for ( mwetag_i, mwetag ) in enumerate( mwetags_list ) :
            if mwetag:
                mwetag_new = [candids[x] for x in mwetag]
                templ =  "<span class=\"mwepart %(ids)s\">%(w)s</span>"
                result[mwetag_i] = templ % {"ids":" ".join(mwetag_new),
                                            "w":result[mwetag_i]}
        return result


################################################################################

    def to_html( self ):
        """
        Provides an HTML simple representation of the sentence.

        @return: An HTML string representing the current sentence
        """
        templ = "<p class=\"sent\">\n<span class=\"sid\">%(sid)d</span>\n" \
                "%(sent)s</p>"
        list = [w.to_html(i + 1) for (i, w) in enumerate(self.word_list)]
        return templ % {"sent": "\n".join(self.add_mwe_tags_html(list)),
                        "sid": self.id_number}


################################################################################

    def to_corenlp(self, ctxinfo):
        """
            Provides an XML string representation of the current object,
            including internal variables, formatted as CoreNLP.

            @return A string containing the XML element <sentence> with
            its internal structure and attributes.
        """
        from .. import util
        result = "<sentence"
        if self.id_number >= 0:
            result += " id=\"" + str(self.id_number) + "\">\n\t<tokens>\n"
        else:
            result += ">\n\t<tokens>\n\t"
        for word in self.word_list:
            result = result + word.to_corenlp(ctxinfo) + " "
        result += '</tokens>\n'

        result += self.word_list[-1]._props['xml']  # append dependency information

        if self.mweoccurs:
            result += "\n<mweoccurs>\n"
            for mweoccur in self.mweoccurs:
                result += "  " + util.to_xml(ctxinfo, mweoccur) + "\n"
            result += "</mweoccurs>\n"
        result += "</sentence>"

        return result.strip()

################################################################################

    def get_ngrams( self, n ) :
        """
            Returns all the `Ngram`s of size `n` in the current sentence. For 
            example, if n=1 and the sentence has m words, returns a list of m 
            ngrams containing one `Word`, i.e. all words of the sentence. If 
            n=2, will return a list with m - 1 bigrams. In the general case of 
            n <= m, returns a list of m - n + 1 ngrams. Please notice that only
            adjacent words are considered. For instance, if the sentence is 
            something like "The man is in the house", valid bigrams are "The 
            man", "man is", "is in", "in the" and "the house", but NOT "The is"
            or "in house", and so on. If there are two identical ngrams, they
            will be returned as separate objects. The `Ngram`s are generated in
            the order in which they occur in the sentence.
            
            @param n An integer representing the size (i.e. number of words) of 
            the ngrams to extract. The value of n should be lower or equal to 
            the number of words in the sentence, otherwise an empty list is 
            returned. 
            
            @return A list of `Ngram`s corresponding to the substrings of the
            sentence that contain `n` words. Notice that we extract substrings
            (i.e. adjacent words) and not subsequences (i.e. possibly gapped).
        """
        ngrams = []
        m = len( self.word_list )
        if n <= m :
            for i in range( m - n + 1 ) :
                ngrams.append( Ngram( self.word_list[ i : i+n ], None ) )
        return ngrams
        
################################################################################
        
if __name__ == "__main__" :
    import doctest
    doctest.testmod()  
