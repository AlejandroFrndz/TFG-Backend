#!/usr/bin/python
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2018 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos, Manon Scholivet
#
# ft_cupt.py is part of mwetoolkit
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
This module provides classes to manipulate files that are encoded in the
"CONLLU" filetype, which is a useful input/output corpus textual format.

You should use the methods in package `filetype` instead.
"""


from . import _common as common
from ..base.candidate import Candidate
from ..base.sentence import SentenceFactory
from ..base.word import Word
import collections
from .. import util
import re



class ConllUInfo(common.FiletypeInfo):
    r"""FiletypeInfo subclass for CONLLU."""
    description = "CONLLU tab-separated 10-entries-per-word"
    filetype_ext = "CONLLU"

    comment_prefix = "#"
    escaper = common.Escaper("\\{", "}", [
            ("\\", "\\{backslash}"), ("_", "\\{underscore}"),
            ("#", "\\{hash}"), ("\t", "\\{tab}"), ("\n", "\\{newline}")
    ])    

    def operations(self):
        return common.FiletypeOperations(ConllUChecker, ConllUParser,
                ConllUPrinter)
                
INFO = ConllUInfo()

class ConllUChecker(common.AbstractChecker):
    r"""Checks whether input is in CONLLU format.""" 
    def matches_header(self, strict):
        header = self.fileobj.peek(1024)
        for line in header.split(b"\n"):
            if line and not line.startswith(
                    util.utf8_unicode2bytes(self.filetype_info.comment_prefix)):
                return len(line.split(b"\t")) == 10
	    return False

class ConllUParser(common.AbstractTxtParser):
    r"""Instances of this class parse the CONLLU format,
    calling the `handler` for each object that is parsed.
    """
    valid_categories = ["corpus"]

    def __init__(self, encoding='utf-8'):
        super(ConllUParser,self).__init__(encoding)
        self.sentence_factory = SentenceFactory()
        self.column_headers = None        
        self.partial_sentence = self.sentence_factory.make()
        self.category = "corpus"          

    def _parse_line(self, line, ctxinfo):
        data = line.split("\t")
        if len(data) <= 1: # end of sentence => sent to handler and restart partial
          self.handler.handle_sentence(self.partial_sentence,ctxinfo)
          self.partial_sentence = self.sentence_factory.make()
          return

        if len(data) != len(self.column_headers):
            ctxinfo.error("Expected {n_expected} entries, got {n_gotten}",
                    n_expected=len(self.column_headers),
                    n_gotten=len(data))                      

        w = self._parse_word(data, ctxinfo)
        self.partial_sentence.append(w)            

    def _parse_word(self, word_data, ctxinfo):
        w_dict = dict(zip(self.column_headers,word_data))
        w_dict = {k:self.unescape(v) for (k,v) in w_dict.items() if v != "_"}
        w = Word(ctxinfo, w_dict)        
        syn1 = w.get_prop("@cupt:DEPREL", None)
        syn2 = w.get_prop("@cupt:HEAD", None)        
        if syn1 is not None and syn2 is not None:
            w.syn = str(syn1) + ":" + str(syn2)
        return w


class ConllUPrinter(common.AbstractPrinter):
    valid_categories = ["corpus"]
    
    def handle_sentence(self, sentence, ctxinfo):
        for (mweid,mweoccur) in enumerate(sentence.mweoccurs,1) :
          indexes = list(sorted(mweoccur.indexes))
          for i in indexes :
            mwecode = ""            
            if sentence[i].has_prop("@cupt:PARSEME:MWE"):
              mwecode += sentence[i].get_prop("@cupt:PARSEME:MWE",None)+";"
            mwecode += str(mweid)
            if i == indexes[0] and mweoccur.category:
              mwecode += ":" + mweoccur.category
            sentence[i].set_prop("@cupt:PARSEME:MWE",mwecode)
          
        for (i,w) in enumerate(sentence) :
          out_fields = []
          out_fields.append(self.escape_or_fallback(w,"@cupt:ID",str(i+1)))
          out_fields.append(self.escape_or_fallback(w,"surface","_"))
          out_fields.append(self.escape_or_fallback(w,"lemma","_"))
          out_fields.append(self.escape_or_fallback(w,"pos","_"))
          out_fields.append(self.escape_or_fallback(w,"@cupt:XPOS","_"))
          out_fields.append(self.escape_or_fallback(w,"@cupt:FEATS","_"))
          if w.has_prop("syn") :
            deprel,head = w.syn.rsplit(":",1)            
            out_fields.append(self.escape(head))
            out_fields.append(self.escape(deprel))          
          else :
            out_fields.append(self.escape_or_fallback(w,"@cupt:HEAD","_"))
            out_fields.append(self.escape_or_fallback(w,"@cupt:DEPREL","_"))
          out_fields.append(self.escape_or_fallback(w,"@cupt:DEPS","_"))
          out_fields.append(self.escape_or_fallback(w,"@cupt:MISC","_"))
          out_fields.append(self.escape_or_fallback(w,"@cupt:PARSEME:MWE","*"))          
          self.add_string(ctxinfo,"\t".join(out_fields),"\n")
        self.add_string(ctxinfo,"\n")
