#! /usr/bin/env python3
# -*- coding: utf-8 -*-

################################################################################
#
# Copyright 2010-2018 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos, Manon Scholivet
#
# train_crf.py is part of mwetoolkit
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
   Transform dimsum to CRFsuite format, and learn a model trained with crfsuite
"""


################################################################################






import re
import os
import sys
import fileinput

from libs.base.word import Word
from libs import util
from libs import filetype



usage_string = """\
Usage: {progname} OPTIONS <corpus>
Train CRF model to tag MWEs based on training <corpus>

The <corpus> input file must be in one of the filetype
formats accepted by the `--from` switch. (Only Dimsum format is accepted for the moment)


OPTIONS may be:

--from <input-filetype-ext>
    Force conversion from given filetype extension.
    (By default, file type is automatically detected):
    {descriptions.input[corpus]}

--to <output-filetype-ext>
    Convert input to given filetype extension.
    (By default, keeps input in original format):
    {descriptions.output[corpus]}

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

-c or --crfsuite <crfsuite>
    path to the executable version of crfsuite, if tou don't want to use default version

-m or --model <CRF.model>
    path where you want to store the model.
    By default, store the model in test/CRF/CRF.model

-k or --keepCRFfile
    If you decide to keep the intermediary file, containing CRFsuite format.
    This file will be keep in bin/ repository  (in CRFfile.CRF).
    
-r or --l2regu
    Value c2 for L2 regularization to use for CRFSuite. Default value is 
    1, typical values range from 3^-6 to 3^2.

"""




# MAIN SCRIPT




import dimsumToCRF

if __name__ == "__main__":
    args = util.read_options( dimsumToCRF.shortopts, dimsumToCRF.longopts, dimsumToCRF.treat_options, -1, usage_string )
    if args == []:
        sys.stderr.write("You forget to give dimsum file!\n")
        exit(1)

    util.verbose("Transform in CRFsuite format...\n\n")
    filetype.parse(args, dimsumToCRF.DimsumToCRF(), dimsumToCRF.input_filetype_ext)

    import subprocess

    util.verbose("Learning the model ..\n\n")
    cmd = dimsumToCRF.pathCRFsuite+" learn -m "+dimsumToCRF.model+" -p c2=" +str(dimsumToCRF.l2regu)+ " " +dimsumToCRF.TEMP_CRF #learn a model with crfsuite
    util.verbose(cmd)
    subprocess.check_output(['bash','-c', cmd])
    util.verbose("Model learnt!")

    if not dimsumToCRF.keepCRFfile : #if option --keepCRFfile, doen't do this, and keep intermediary CRFfile in bin (CRFfile.CRF)
        os.remove(dimsumToCRF.TEMP_CRF)
        util.verbose("Delete intermediary file (crfsuite format)\n")

