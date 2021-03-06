# -*- coding:UTF-8 -*-

# ###############################################################################
#
# Copyright 2010-2015 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# ft_palavras.py is part of mwetoolkit
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
# ###############################################################################
"""
This module provides classes to manipulate files that are encoded in the
"PALAVRAS" filetype, which is generated by PALAVRAS parser.

You should use the methods in package `filetype` instead.
"""






from collections import OrderedDict

from . import _common as common
from ..base.sentence import SentenceFactory
from ..base.word import Word
from .. import util


class PalavrasInfo(common.FiletypeInfo):
    r"""FiletypeInfo subclass for PALAVRAS."""
    description = "PALAVRAS parser format"
    filetype_ext = "PALAVRAS"

    comment_prefix = "#"
    # Input-only, makes no sense to unescape what the parser doesn't escape
    escaper = None

    def operations(self):
        return common.FiletypeOperations(PalavrasChecker,
                PalavrasParser, PalavrasPrinter)


INFO = PalavrasInfo()


class PalavrasChecker(common.AbstractChecker):
    r"""Checks whether input is in PALAVRAS format."""

    def matches_header(self, strict):
        header = self.fileobj.peek(1024)
        for line in header.split(b"\n"):
            if line and not line.startswith(
                    util.utf8_unicode2bytes(self.filetype_info.comment_prefix)):
                parts = line.split(b"\t")
                if len(parts)==1 and \
                        (parts[0].startswith(b"$") or \
                        parts[0].startswith(b"<")):
                    continue  # one of [$, $. $START $! ...]

                return len(parts) == 2 and (
                        syninfo.startswith(b"[") or \
                        syninfo.startswith(b"#") or \
                        syninfo.startswith(b"@") or \
                        syninfo.startswith(b"<") or \
                        syninfo.isupper() \
                        for syninfo in parts[1].split(b" ")
                )
        return not strict


class PalavrasParser(common.AbstractTxtParser):
    r"""Instances of this class parse the PALAVRAS format,
    calling the `handler` for each object that is parsed.
    """
    valid_categories = ["corpus"]

    def __init__(self, encoding='utf-8'):
        super(PalavrasParser, self).__init__(encoding)
        self.sentence_factory = SentenceFactory()
        self.category = "corpus"


    def _parse_line(self, line, ctxinfo):
        if len(line.strip()) == 0:
            return  # ignore empty line

        elif line.strip() == "</s>":  # close sentence
            self.flush_partial_callback()

        elif line.strip() in ("<s>", "$??"):
            # (Old syntax. We discard previous words in this sentence,
            # because PALAVRAS used to produce garbage before these lines)
            self.discard_partial_callback()

        elif line.startswith("<"):
            self._parse_tag(line, ctxinfo)

        else:  # regular word
            w = self._parse_word(line, ctxinfo)
            if w is not None:
                if w.get_prop("@palavras:id", None) == "1" or self.partial_args is None:
                    self.new_partial(self.handler.handle_sentence,
                                     self.sentence_factory.make(), ctxinfo=ctxinfo)
                self.partial_args[0].append(w)


    def _parse_tag(self, line, ctxinfo):
        if line.startswith("<##") and line.endswith("##/>"):
            # Special mwetoolkit syntax: "<##comment or directive tag##/>"
            from xml.sax.saxutils import unescape
            content = unescape(line[3:-4], {"&apos;": "'", "&quot;": '"'})
            obj = common.directive_or_comment_from_string(content)
            self.handler.handle(obj, ctxinfo)

        else:  # e.g. "<lixo" tag
            pass  # Just quietly ignore it
            # PALAVRAS issues too many random tags


    def _parse_word(self, line, ctxinfo):
        w = Word(ctxinfo, {})
        if line.startswith("$"):
            w.set_prop("surface", line[1:].split()[0])
            return w

        surf_and_rest = line.split("\t", 1)
        (synrel, synhead) = ("", None)
        pos = OrderedDict()
        semantics = OrderedDict()

        if len(surf_and_rest) == 2:
            w.set_prop("surface", surf_and_rest[0].strip())
            rest = surf_and_rest[1].split()
            partsem = None
            for syninfo in rest:
                if syninfo.startswith("[") and syninfo.endswith("]"):
                    w.set_prop("lemma", syninfo[1:-1])
                elif syninfo.startswith("@"):
                    synrel += syninfo[1:]

                elif syninfo.startswith("#"):
                    syninfo = syninfo[1:]
                    if "->" not in syninfo:
                        syninfo = "0->0"
                        ctxinfo.warn("Relation lacks `->`: `{syn}`", syn=syninfo)
                    relpair = syninfo.split("->")
                    try:
                        synhead = int(relpair[1])-1
                    except (IndexError, ValueError):
                        ctxinfo.warn("Relation lacks a head: `{syn}`", syn=syninfo)
                    w.set_prop("@palavras:id", relpair[0])

                elif syninfo.startswith("<") and syninfo.endswith(">"):
                    semantics[syninfo[1:-1]] = 1
                elif syninfo.startswith("<"): # space-broken semantics <poss 3S>
                    partsem = syninfo[1:]
                elif syninfo.endswith(">") and partsem:
                    semantics[partsem + syninfo[:-1]] = 1
                    partsem = None
                elif syninfo.isupper():
                    pos[syninfo] = 1
                else:
                    ctxinfo.warn("Unparseable word part `{part}`", part=syninfo)
            if synrel != "":
                if synhead is not None:
                    w.set_prop("syn", Word.syn_encode([(synrel,synhead)]))
                else:
                    w.set_prop("@palavras:headless_syn", synrel)
            if pos:
                w.set_prop("pos", ".".join(list(pos.keys())))
            if semantics:
                w.set_prop("@palavras:semantics", ".".join(list(semantics.keys())))
        else:
            ctxinfo.warn("Ignoring malformed line `{line}`", line=line)
            return None
        return w



class PalavrasPrinter(common.AbstractPrinter):
    """Instances can be used to print Moses format."""
    valid_categories = ["corpus"]

    def handle_sentence(self, sentence, ctxinfo):
        if sentence.mweoccurs:
            ctxinfo.warn_once("Unable to represent MWEs in PALAVRAS format")

        for i, word in enumerate(sentence):
            id_s = word.get_prop("@palavras:id", str(i+1))
            UNKNOWN = "{?}"

            syn_pairs = list(word.syn_iter(ctxinfo))
            if syn_pairs:
                self.add_string(ctxinfo, (word.surface or UNKNOWN),
                        " \t[", (word.lemma or UNKNOWN), "]")

                for sem in util.decent_str_split(word.get_prop("@palavras:semantics", ""), "."):
                    self.add_string(ctxinfo, " <", sem, ">")
                self.add_string(ctxinfo, " ", word.pos.replace(".", " "))

                synrel, syndep = syn_pairs[0]
                self.add_string(ctxinfo, " @", str(synrel),
                        "  #", id_s, "->", str(syndep+1))
            else:
                self.add_string(ctxinfo, "$",
                        (word.surface or UNKNOWN),
                        " #", id_s, "->0")
            self.add_string(ctxinfo, "\n")
        self.add_string(ctxinfo, "</s>\n\n")
