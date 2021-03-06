#!/usr/bin/python
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# frequency.py is part of mwetoolkit
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
    This module provides the `Frequency` class. This class represents a 
    frequency of occurrences of an element in a corpus, i.e. an integer for the
    number of times the element (word or ngram) appears in the corpus.
"""






from .feature import Feature

################################################################################

class Frequency( Feature ) :
    """
        A `Frequency` is a count of occurrences of a certain element (a word or
        a ngram) in a certain corpus. Frequency extends `Feature`, so the name 
        corresponds to the name that identifies the corpus from which the 
        frequency was drawn while value is an integer containing (an 
        approximation of) the number of times the element occurs in the corpus.    
    """

################################################################################

    def __init__( self, name, value ):
        r"""(See Feature.__init__)."""
        super(Frequency, self).__init__(name, value, xml_class="freq")
        
################################################################################
        
if __name__ == "__main__" :
    import doctest
    doctest.testmod()   
