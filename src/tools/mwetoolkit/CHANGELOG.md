mwetoolkit
==========
*Multiword Expressions toolkit*

********************************************************************************

VERSION 1.1
===========

* Released: October 08, 2015

Improvements:
-------------

1. Important bug correction in C indexer and giga-word corpus support
2. New tools (grep.py, view.py, split.py,...)
3. New supported corpus formats (RASP, PALAVRAS,...)
4. More unit tests (patterns,...)
5. Improved handling of extra word attributes
6. Improved compressed files support (.gz,...)
7. Experimental: TextualPattern format for patterns (grep.py -e "...")
8. General bug fixes, refactoring and improvements

    
********************************************************************************

VERSION 1.0
===========

* Released: April 16, 2015

Improvements:
-------------

1. Full support to many file types - includes full documentation
2. Support to compressed file formats (.gz...)
3. Included many tests and corrected existing ones
4. General bug fixes, refactoring and improvements
    
********************************************************************************

VERSION 0.6
===========
  
* Released: September 19, 2014

Improvements:
-------------

1. New regexp-like functionalities such as negation
2. Full support to textual Moses factored format in indexing
3. Format conversion scripts for XML, Moses, CoNLL, etc.
4. New matching options in candidates.py (overlapping, longest/shortest)
5. Token-based MWE identification in annotate_mwe.py
6. Remove DTD dependency (no validation)
7. General bug fixes, refactoring and improvements
    
********************************************************************************

VERSION 0.5
===========
  
* Released: March 09, 2012

Improvements:
-------------

1. Regression test suite on several corpora
2. LocalMaxs implementation for candidate extraction
3. More conversion scripts (including treetagger2xml)
4. Fully functional syntactic extraction
5. Improved indexation and counting programs
6. Up-to-date documentation and help
    
********************************************************************************

VERSION 0.4
===========

* Released: May 17, 2011

Improvements:
-------------

1. Syntax element support
2. mweconsole for easier management of intermediary files and script options
3. index scripts in C, faster and support bigger copora like the BNC
4. added a toy/genia test/quick start guide, at website mwetoolkit.sf.net
5. bug correction, documentation
6. several other features which I don't recall now
    
********************************************************************************

VERSION 0.3
===========

* Released: Aug 27, 2010

Improvements:
-------------

1. better handling of temporary files
2. write errors to stderr instead of stdout
3. sorting script, map script
4. improve filtering script for cropping
5. wc, head and tail tools
6. suffix array indexing, can handle arbitrary ngrams and very large corpora
7. integration with Google API for web counts
8. tons of bug correction
9. some documentation added
10. changed some dtds like the dict dtd and parts of the candidates dtd
    
********************************************************************************

VERSION 0.2
===========

* Released: Dec 09, 2009

Improvements:
-------------
  
1. bug corrections concerning AM features
2. unicode partial support (for languages like Greek, Danish, etc)
3. yahoo cache naming conventions
4. filtering script for occurrence threshold
    
********************************************************************************

VERSION 0.1
===========

* Released: Nov 9, 2009

First version