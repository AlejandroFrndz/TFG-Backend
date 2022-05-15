#! /usr/bin/env python3
# -*- coding: utf-8 -*-

################################################################################
#
# Copyright 2010-2018 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos, Manon Scholivet
#
# dimsumToCRF.py is part of mwetoolkit
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
   Transform dimsum file in crfsuite format
"""

####################################


import re
import os
import sys
import fileinput

from libs.base.word import Word
from libs import util
from libs import filetype
from libs.filetype.ft_dimsum import DimsumParser, DimsumPrinter


################################################################################
# GLOBALS

listOfExistingFeatures = ["^[plw]\[\-?[0-9]\](\|[plw]\[\-?[0-9]\])*$", "^digits$", "^hyphen$", "^capitalized$", "^allCapitalized$", "^capitalizedAndBOS$", "^LF$", "^AM_"] #the list of all accepted features, including LF, even if this functionality is not implemented for the moment


# default values
input_filetype_ext = None
output_filetype_ext = None
pathFileAM = None
pathFileLF = None
features = None
l2regu = 1.0
nameAMs = []

eval = False
keepCRFfile = False


HERE = os.path.dirname(os.path.realpath(__file__))
PATH_RESOURCES = os.path.join(HERE, "../resources")
DEFAULT_PATH_CRFSUITE = os.path.join(PATH_RESOURCES, "CRFSuite/bin/crfsuite")  # default path
model = "./CRF.model"  # default path

longopts = [ "from=", "pathListFeatures=", "pathFileAM=", "pathFileLF=", "eval", "crfsuite=", "model=", "keepCRFfile", "l2regu="]
shortopts = "f:a:l:ec:m:kr:"

################################################################################

#Currently not implemented

def findLF(sentence, i):
    return ""

################################################################################

def findAMFeature(feature, sentence, i, tupleCurAMngram):
    if(tupleCurAMngram != None): #if we're currently on a ngram with an AM value
        if(tupleCurAMngram[1] == i): #if we're not any more on this gram
            tupleCurAMngram = None
        else:
            ngramAM = ""
            for index in range(tupleCurAMngram[0], tupleCurAMngram[1]): #get back the ngram, knowing its index of beggining and ending
                ngramAM += sentence[index].get_prop("lemma") + " "
            ngramAM = ngramAM[:-1] # erase the last ' '
            value = listAM.get(ngramAM).get(feature) #get back the value
            return value, tupleCurAMngram

    if(tupleCurAMngram == None): #if we're not currently in a ngram with a value
        possibleNgramAM = ""
        for index in range(i, i+MAX_SIZE_NGRAM_AM): #we get back the longest possible ngram
            try:
                possibleNgramAM += sentence[index].get_prop("lemma") + " "
            except IndexError:
                break
        possibleNgramAM = possibleNgramAM[:-1]
        while(len(possibleNgramAM.split(" ")) > 1): #while possibleNgramAM is a bigram or more
            if(possibleNgramAM in listAM): #we try if this ngram is an existing key in the AM's dictionary
                value = listAM.get(possibleNgramAM).get(feature)
                return value, (i, i+len(possibleNgramAM.split(" "))) #return the value of the feature, and the begin and end index of the ngram
            else:
                possibleNgramAM = re.sub(" [^ ]*$", "", possibleNgramAM) #we try a less long ngram
    return -1, None

################################################################################

def findOrthographicFeature(feature, sentence, i):
    word = sentence[i].get_prop("surface")
    if(feature == "hyphen"):
        return bool(re.search('-', word))
    if(feature == "digits"):
        return (any(char.isdigit() for char in word))
    if(feature == "capitalizedAndBOS"):
        return word[0].isupper() and ( i == 0 )
    if(feature == "capitalized"):
        return word[0].isupper()
    if(feature == "allCapitalized"):
        return word.isupper()

################################################################################

def findNgram(feature, sentence, i):
    ngram = ""
    feature = feature.split("|")
    for f in feature: #for each feature in the ngram feature ( p[0], l[2], w[-3], ....)
        token = f[0] # p, l or w
        index = int(f[2:-1]) # the index of the token we want, depending on the current index
        index += i # the index in the sentence of the token we want
        if(index < 0 ): #if the index is out of the bound
            return ""
        try:
            word = sentence[index] #the token we're interested
        except IndexError: #if the index is out of the bound
            return ""
        if(token == "p"):
            token = word.get_prop("pos","_")
            # fall back to xpos if necessary
            if token == "_" :
                token = word.get_prop("cupt@XPOS","_")
        elif(token == "l"):
            token = word.get_prop("lemma","_") # fall back to surface if necessary
            if token == "_" :
                token = word.get_prop("surface","_")
        elif(token == "w"):
            token = word.get_prop("surface","_")
        else:
            sys.stderr.write("Error findNgram\n")
            exit(1)
        ngram += token+"|"
    return ngram[0:-1] # erase the last '|'

################################################################################

# find the value of the current features
# tupleCurAMngram is the tuple (index of the first ngram's token, index of the last ngram's token)
# return the value of the feature and tupleCurAMngram (because it's on multiple tokens)
def findValueFeature(sentence, i, curFeature, tupleCurAMngram):
    for indexPattern, pattern in enumerate(listOfExistingFeatures):
        result = re.search(pattern, curFeature)
        if(result):
            break
    if(indexPattern == 0):
        return findNgram(curFeature, sentence, i), tupleCurAMngram
    elif(indexPattern >= 1 and indexPattern <= 5):
        return findOrthographicFeature(curFeature,sentence, i), tupleCurAMngram
    elif(indexPattern == 7):
        return findAMFeature(curFeature, sentence, i, tupleCurAMngram)
    elif(indexPattern == 6):
        return findLF(sentence, i), tupleCurAMngram
    else:
        sys.stderr.write("Error findValueFeature function\n")
        exit(1)

################################################################################

def findStringLine(sentence, index, featuresValues, ctxinfo): #find the line corresponding to the CRF line, knowing all the feature's value
    #dimsumprinter = DimsumPrinter(ctxinfo, "corpus",output=)
    #dimsumprinter.handle_sentence(sentence,ctxinfo)
    bio = sentence.bio_list(update_mweoccurs=True)
    tag = bio[index]
    line = tag

    for feature,value in featuresValues.items():
        line += "\t"+feature+"="+str(value)

    return line

################################################################################


TEMP_CRF = '/tmp/CRFfile.crf'
open(TEMP_CRF, "w").close()  # Force create/truncate


class DimsumToCRF(filetype.InputHandler):
    """Transform a file in corpus file in a crfsuite format"""
    
    def handle_comment(self, comment, ctxinfo):
        """Input corpus comments should not be shown
        """
        pass
    
    def handle_sentence(self, sentence, ctxinfo):
        """For each sentence in the corpus, transform
        in CRFSuite format
        """

        global CRFfile
        global features

        fileCRF = open(TEMP_CRF, "a")

        tupleCurAMngram = None
        for i in range(len(sentence)): #browse each word of the sentence
            featuresValues = dict()
            for curFeature in features: #Find each value of features, if existing
                value, tupleCurAMngram = findValueFeature(sentence, i, curFeature, tupleCurAMngram)
                if(value != ""):
                    featuresValues[curFeature] = value #store each couple feature/value
            if(i == 0): #add information if the word is the begin or the end of the sentence
                infoSequencePosition = "\t__BOS__\n"
            elif(i == len(sentence)-1):
                infoSequencePosition = "\t__EOS__\n"
            else:
                infoSequencePosition = "\n"

            CRFLine = findStringLine(sentence, i, featuresValues, ctxinfo) + infoSequencePosition
            fileCRF.write(CRFLine) #write in the crfsuite format file

        fileCRF.write("\n")
        fileCRF.close()


################################################################################

def verifyIsAnExistingFeatures(feature):
    global nameAMs
    for pattern in listOfExistingFeatures:
        result = re.search(pattern, feature)
        if(result): #if feature match with pattern
            if(feature.startswith("AM_")): #if the pattern was the AM pattern
                if feature not in nameAMs:  #verify the feature is inside the AM file
                   sys.stderr.write("'"+feature+"' is not an accepted feature, because it's not present in AMs file\n")
                   return False
            return True

    sys.stderr.write("'"+feature+"' is not an accepted feature\n")
    return False

################################################################################

# read the features file and verify if each features is an accepted feature.
# return a list
def getFeatures( f_filename ) :
    global pathFileAM
    global pathFileLF

    try :
        f_data = open( f_filename )
    except IOError :
        sys.stderr.write("Features file "+f_filename+" not found\n")
        exit(1)

    features = []
    for line in f_data.readlines() :
        feature = line.rstrip()
        if(verifyIsAnExistingFeatures(feature)):
            if(pathFileAM == None and feature.startswith("AM_")):
                sys.stderr.write("Failed : The feature "+feature+" is not allow, because you don't give a file with AMs\n")
                exit(1)
            elif(pathFileLF == None and feature == "LF"):
                sys.stderr.write("Failed : The feature "+feature+" is not allow, because you don't give a file with Lexical Features\n", feature)
                exit(1)
            else:
                features.append(feature)
        else:
            f_data.close()
            exit(1)
    f_data.close()
    return features

################################################################################

# read the AM file and get back all the information
# return a dict of dict (first key, the ngram, and for each ngram, keys will be the AM (pmi, ll, t dice ...)) and return the list of all the am features.
def getAssociationMeasures(fileAM):
    global MAX_SIZE_NGRAM_AM
    MAX_SIZE_NGRAM_AM = 0

    try :
        fileQuantise = open(fileAM, "r")
    except IOError :
        sys.stderr.write("Features file "+fileAM+" not found\n")
        exit(1)

    line = fileQuantise.readline()
    while(line[0] == "#"): #ignore comment lines, lines starting with a '#'
        line = fileQuantise.readline()

    columnsName = line.rstrip().split("\t") #the first line contains the name of all the AM features
    try : #we look for a column containing the ngrams
        indexNgram = columnsName.index("ngram")
    except ValueError :
        sys.stderr.write("There is no 'ngram' column in this file..\n")

    for index in range(len(columnsName)): #Add a 'AM_' before each feature name, to correspond with the pattern of the AM feature in listOfExistingFeatures
        columnsName[index] = "AM_"+columnsName[index]

    listAM = dict()
    line = fileQuantise.readline()
    while(line != ""):
        if(line[0] == "#"): #ignore comment lines, lines starting with a '#'
            line = fileQuantise.readline()
            continue
        infos = line.rstrip().split("\t")
        mesures = dict()
        for index in range(len(infos)): #browse each infos ( so, each AM features value)
            if(index == indexNgram):
                ngram = infos[index]
                n = len(ngram.split(" "))
                if(n > MAX_SIZE_NGRAM_AM):
                    MAX_SIZE_NGRAM_AM = n
            else:
                curAM = infos[index]
                mesures[columnsName[index]] = curAM
        listAM[ngram] = mesures
        line = fileQuantise.readline()
    columnsName.pop(indexNgram) # We don't want the ngram in the list of AM features.

    return listAM, columnsName

################################################################################

def download_crfsuite():
    print('INFO: Downloading CRFSuite', file=sys.stderr)
    import urllib.request
    tgz_path = os.path.join('/tmp/crfsuite-0.12-x86_64.tar.gz')
    urllib.request.urlretrieve(
        'https://github.com/downloads/chokkan/crfsuite/crfsuite-0.12-x86_64.tar.gz',
        tgz_path)
    import tarfile
    tarfile.open(tgz_path).extractall(PATH_RESOURCES)
    import shutil
    shutil.move(PATH_RESOURCES+'/crfsuite-0.12', PATH_RESOURCES+'/CRFSuite')

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
    global listAM
    global features
    global pathFileAM
    global pathFileLF
    global eval
    global pathCRFsuite
    global model
    global keepCRFfile
    global nameAMs
    global l2regu

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)
    pathListFeatures = os.path.join(HERE, '../resources/default-config/listFeatures.txt')  # default features list
    pathCRFsuite = DEFAULT_PATH_CRFSUITE

    for o, a in ctxinfo.iter(opts):
        if o == "--from":
            input_filetype_ext = a
        elif o == "--to":
            output_filetype_ext = a
        elif o in ("--pathListFeatures", "-f"):
            pathListFeatures = os.path.realpath(a)
        elif o in ("--pathFileAM", "-a"):
            pathFileAM = os.path.realpath(a)
        elif o in ("--pathFileLF", "-l"):
            pathFileLF = os.path.realpath(a)
        elif o in ("--eval", "-e"):
            eval = True
        elif o in ("--crfsuite", "-c"):
            pathCRFsuite = os.path.realpath(a)
        elif o in ("--model", "-m"):
            model = os.path.relpath(a)
        elif o in ("--l2regu", "-r"):
            try:
              l2regu = float(a)
            except ValueError:
              sys.stderr.write("The -r parameter must be a float")
              exit(-1)
        elif o in ("--keepCRFfile", "-k"):
            keepCRFfile = True
        else:
            raise Exception("Bad arg: " + o)


    if not os.path.exists(pathCRFsuite):
        if pathCRFsuite == DEFAULT_PATH_CRFSUITE:
            download_crfsuite()
        else:
            sys.stderr.write("Error : "+pathCRFsuite+ " not found\n")
            exit(1)

    if not os.path.exists(pathListFeatures):
        sys.stderr.write("Error : "+pathListFeatures + " not found\n")
        exit(1)

    if pathFileAM is not None:
        listAM, nameAMs = getAssociationMeasures(pathFileAM)

    features = getFeatures(pathListFeatures)
    if(len(features) < 1):
        ctxinfo.error("Not enough features in features file {file}", file=pathListFeatures)
        exit(1)

