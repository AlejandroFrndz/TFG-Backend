#! /usr/bin/env python3
# -*- coding: utf-8 -*-

################################################################################
#
# Copyright 2010-2018 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos, Manon Scholivet
#
# annotate_crf.py is part of mwetoolkit
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

#CRFsuite license
################################################################################

# Copyright (c) 2002-2016, Naoaki Okazaki
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials# provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

################################################################################
"""
   Prints a list of predict tags, given a file in dimsum format, using a model learn with train_crf.py
   Use the script dimsumToCRF to transform in a valid format for crfsuite.
"""

import re
import sys
import os
import fileinput
import dimsumToCRF

from libs.base.word import Word
from libs.base.mweoccur import MWEOccurrence
from libs import util
from libs import filetype

usage_string = """\
Usage: {progname} OPTIONS <corpus>
Tag <corpus> with MWEs based on CRF model learned with `train_crf.py`

The <corpus> input file must be in one of the filetype
formats accepted by the `--from` switch.

The output is in DiMSUM format.


OPTIONS may be:

--from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

-f or --pathListFeatures <listFeatures.txt>
    To give a file containing a features list
    (must have the same format you can see in mwetoolkit/test/CRF/listFeatures.txt,
     which is the list uses by default)

-a or --pathFileAM <AM.quantise>
    To give a file containing association measures
    (you can find an example in mwetoolkit/test/CRF/result_AM_EN.quantise)

-l or --pathFileLF <LF.txt>
      WARNING: not implemented! Only mentioned for documentation
    To give a file containing lexical features

-e or --eval
    If your file contains gold BIO, and you want to have precision, recall and F1 mesure

-c or --crfsuite <crfsuite>
    path to the executable version of crfsuite,
    if you don't want to use default version

-m or --model <CRF.model>
    path where the file containing a model is store.
    By default, try to find a model in test/CRF/CRF.model

-k or --keepCRFfile
    If you decide to keep the intermediary file, containing CRFsuite format.
    This file will be keep in bin/ repository  (in CRFfile.CRF).


{common_options}
"""

class CorpusTagger(filetype.ChainedInputHandler):
    """Tag a corpus with CRFSuite tags corresponding to MWEs"""
    
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, dimsumToCRF.output_filetype_ext)    
        self.chain.before_file(fileobj, ctxinfo)

    
    def __init__(self,taglist ):
        """
        """
        self.taglist = taglist
        self.tagindex = 0
        super().__init__()   
    
    
    def handle_sentence(self, sentence, ctxinfo):
        """For each sentence in the corpus, transform
        in CRFSuite format
        """
        sentence.mweoccurs = []
        senttags = []
        lastmwe = None
        i = 0
        while self.tagindex < len(self.taglist) and self.taglist[self.tagindex] :            
            curtag = self.taglist[self.tagindex]
            if curtag[0] in ['I', 'i'] :
                if not lastmwe :
                    ctxinfo.warn("I tag with no preceding B => treating as B")
                    curtag[0] = 'B' # 
                else :
                    lastmwe.indexes.append(i)
            if curtag[0] in ['B', 'b'] : # start of new MWE
                lastmwe = MWEOccurrence(sentence,None,[i],'CRF') # category?
                sentence.mweoccurs.append(lastmwe)
            senttags.append(self.taglist[self.tagindex])
            self.tagindex += 1
            i += 1
        self.tagindex += 1
        if len(sentence) != len(senttags):
            ctxinfo.error("Input corpus and tags generated by CRFSuite are not aligned")
        #print(senttags)
        # remove all MWEOccurs from sentence
        # add MWEOccurs corresponding to tags
        self.chain.handle_sentence(sentence,ctxinfo)


#################
# Main script


args = util.read_options(dimsumToCRF.shortopts, dimsumToCRF.longopts, dimsumToCRF.treat_options, -1, usage_string )
if args == []:
    sys.stderr.write("You forgot to provide a corpus file!\n")
    exit(1)

util.verbose("Transform in CRFsuite format...\n\n")
filetype.parse(args, dimsumToCRF.DimsumToCRF(), dimsumToCRF.input_filetype_ext)

if not os.path.exists(dimsumToCRF.model): #Verify the path to the model
    sys.stderr.write("Error : "+dimsumToCRF.model + " not found\n")
    exit(1)
import subprocess
util.verbose("Tagging!\n\n")

cmd = dimsumToCRF.pathCRFsuite+" tag -m "+dimsumToCRF.model+" "+dimsumToCRF.TEMP_CRF
util.verbose(cmd)
tagsfile =  subprocess.check_output(['bash','-c', cmd]).decode('utf-8').split("\n")
filetype.parse(args, CorpusTagger(tagsfile), dimsumToCRF.input_filetype_ext)


# This format transformation part is ugly and should use mwetk Printers
# However, I'm in a hurry and it's better to output dimsum than the list
# of tags, as it was the case before
# This is a simple loop through the tags + dimsum file, replacing the
# (gold) dimsum tags by predicted ones.
#with open(args[0]) as dimsumfile :
#  print(dimsumfile.readline().strip()) # Format header
  #import pdb
  #pdb.set_trace()  
#  for (tagline, dimsumline) in zip(tagsfile, dimsumfile) :
#    fields = dimsumline.strip().split("\t")
#    if len(fields) != 9 :
#      if tagline == "" :
#        print(dimsumline,end="")
#      else:
#        import pdb
#        pdb.set_trace()
#        util._error("Tags and test file are not aligned")
#    else :
#      tag = tagline.strip()
#      if tag == "B" :
#        index = "0"
#        nextindex = fields[0]
#      elif tag == "I" :
#        index = nextindex
#        nextindex = fields[0]
#      else :
#        index = "0"
#      print("\t".join(fields[:4]+[tag,index]+fields[6:]))

if dimsumToCRF.eval : #if --eval, try to evaluate recall, precision and rappel
    cmd = dimsumToCRF.pathCRFsuite+" tag -m "+dimsumToCRF.model+" -qt "+dimsumToCRF.TEMP_CRF
    sys.stderr.buffer.write(subprocess.check_output(['bash','-c', cmd]))

if not dimsumToCRF.keepCRFfile :
    os.remove(dimsumToCRF.TEMP_CRF)
    util.verbose("Delete intermediary file (crfsuite format)\n")

