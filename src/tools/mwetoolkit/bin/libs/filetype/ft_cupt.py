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
"cupt" filetype, which is a useful input/output corpus textual format.

You should use the methods in package `filetype` instead.
"""


from . import _common as common
from ..base.candidate import Candidate
from ..base.sentence import SentenceFactory
from ..base.word import Word
import collections
from .. import util
import re



class CuptInfo(common.FiletypeInfo):
    r"""FiletypeInfo subclass for cupt."""
    description = "Cupt tab-separated 11-entries-per-word"
    filetype_ext = "cupt"

    comment_prefix = "#"
    escaper = common.Escaper("\\{", "}", [
            ("\\", "\\{backslash}"), ("_", "\\{underscore}"),
            ("#", "\\{hash}"), ("\t", "\\{tab}"), ("\n", "\\{newline}")
    ])    

    def operations(self):
        return common.FiletypeOperations(CuptChecker, CuptParser,
                CuptPrinter)
                
INFO = CuptInfo()

class CuptChecker(common.AbstractChecker):
    r"""Checks whether input is in cupt format."""   
    
    def matches_header(self, strict):
        header = self.fileobj.peek(1024)
        lines = header.split(b"\n")
        if lines and lines[0] :
          return re.match(b"^# *global\.columns *=",lines[0]) is not None
        else :
          return False

class CuptParser(common.AbstractTxtParser):
    r"""Instances of this class parse the cupt format,
    calling the `handler` for each object that is parsed.
    """
    valid_categories = ["corpus"]

    def __init__(self, encoding='utf-8'):
        super(CuptParser,self).__init__(encoding)
        self.sentence_factory = SentenceFactory()
        self.column_headers = None
        #self.ignoring_cur_sent = False
        #self.name2index = {name:i for (i, name) in
        #        enumerate(self.filetype_info.entries)}
        self.partial_sentence = self.sentence_factory.make()
        self.category = "corpus"

    def _parse_comment(self, comment_str, ctxinfo):
        if self.column_headers is None :
          column_equiv = {"@cupt:FORM": "surface", "@cupt:LEMMA": "lemma", "@cupt:UPOS": "pos" }
          self.column_headers = comment_str.split("=")[-1].strip().split(" ")
          self.column_headers = ["@cupt:" + header for header in self.column_headers]
          for (i,header) in enumerate(self.column_headers) :
            if header in column_equiv :
              self.column_headers[i] = column_equiv[header]            
        else :
          super()._parse_comment(comment_str, ctxinfo)
          

    def _parse_line(self, line, ctxinfo):
        data = line.split("\t")
        if len(data) <= 1: # end of sentence => add MWEs and handle          
          from ..base.mweoccur import MWEOccurrence                    
          current_mwes = collections.OrderedDict()
          for (i,word) in enumerate(self.partial_sentence):
            mwe_tags = word.del_prop("@cupt:PARSEME:MWE")
            if mwe_tags and mwe_tags != "*" :
              for mwe in mwe_tags.split(";") :
                num, categ = mwe.split(":") if ":" in mwe else (mwe, None)
                if num not in current_mwes :
                  c = Candidate(num)
                  current_mwes[num] = MWEOccurrence(self.partial_sentence,c,[],categ)              
                current_mwes[num].indexes.append(i)          
          self.partial_sentence.mweoccurs.extend(current_mwes.values())          
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


class CuptPrinter(common.AbstractPrinter):
    DEFAULT_HEADER = "# global.columns = ID FORM LEMMA UPOS XPOS FEATS HEAD DEPREL DEPS MISC PARSEME:MWE"
    valid_categories = ["corpus"]

    def before_file(self, fileobj, ctxinfo):
        self.add_string(ctxinfo, self.DEFAULT_HEADER + "\n")

    
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
