#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2015 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# feat_compositionality.py is part of mwetoolkit
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
    This script adds a new feature which indicates the level of
    compositionality based on an MWE-annotated list of embeddings.

    For more information, call the script with no parameter and read the
    usage instructions.
"""


from libs.base.embedding import Embedding, EmbeddingVector
from libs.base.candidate import Candidate
from libs.base.meta_feat import MetaFeat
from libs import util
from libs import filetype


################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} -e <embeddings-file> OPTIONS <candidates>
Read a MWE lexicon and a MWE-annotated embeddings file.
Output MWE lexicon with a "compositionality" score.

-e <embeddings-file> OR --embeddings <embeddings-file>
    A list of word embeddings to use, in one of these formats:
    {descriptions.input[embeddings]}

The <candidates> input file must be in one of the filetype
formats accepted by the `--candidates-from` switch.


OPTIONS may be:

--combinator <combinator-name>
    Choose a combination function among these:
    * "PointwiseSum": Uses vector addition to combine two vectors.
    (CURRENTLY ONLY "PointwiseSum" is supported).

--find-optimal
    Combines vectors with the best weights possible.
    (Ignores the option --combination-weights).

--combination-weights <list-of-weights>
    When --combinator="PointwiseSum", weights each vector
    according to this colon-separated list of floats.
    Example: --combination-weights="0.4:0.6"

--similarity <similarity-measure>
    Choose a similarity measure among these:
    * "Cosine": Compares with dot product. Output in [0, 1].
    (CURRENTLY ONLY "Cosine" is supported).

-V <vector-name> OR --vecname <vector-name>
    Name of the preferred vector to pick in the embedding.
    (By default, just picks the first vector name seen in
    embeddings file. This does the right thing for formats
    such as word2vec, which only contain one value anyway).

--candidates-from <input-filetype-ext>
    Force reading candidates from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--embeddings-from <input-filetype-ext>
    Force reading embeddings from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[embeddings]}

--to <output-filetype-ext>
    Output new list of candidates in given filetype format
    (By default, outputs candidate in "XML" format):
    {descriptions.output[candidates]}

{common_options}
"""
input_embeddings_filetype_ext = None
input_candidates_filetype_ext = None
output_filetype_ext = "XML"

input_embedding_files = []
finding_optimal = None
vec_combin_weights = None
normalize_input = True
normalize_combined = True
pref_vecname = None


################################################################################

class EmbeddingsSet(filetype.InputHandler):
    r"""InputHandler that builds up `self.targetmwe2embvec`."""
    def __init__(self, candidates):
        self.targetmwe2embvec = {}
        self.interesting_targets = set()
        for candidate in candidates:
            if isinstance(candidate, Candidate):
                for word in candidate:                    
                    self.interesting_targets.add(word.get_prop("lemma",word.get_prop("surface",None)))

    def handle_embedding(self, embedding, ctxinfo):
        r"""For an embedding `pick_up`, keep it if `pick` or `up`
        is in the list of interesting targets.
        (Most of the time, the embedding will be a single-word,
        but we check all elements if it's a MWE just in case).

        Note: We only keep the EmbeddingVector with `pref_vecname` for each embedding.
        """
        if any(target_piece in self.interesting_targets \
                for target_piece in embedding.target_mwe):

            def missing_vecname(vecname, vec):
                global pref_vecname
                if not pref_vecname and embedding.n_vectors() >= 2:
                    ctxinfo.warn_once("No vecname specified; " \
                            "picking `{vecname}`", vecname=vecname)
                if pref_vecname and pref_vecname != vecname:
                    ctxinfo.warn_once("Vecname `{pref_vecname}` not found; " \
                            "using `{vecname}`", vecname=vecname,
                            pref_vecname=pref_vecname)
                pref_vecname = vecname  # Avoid mixing vecnames for corrupted inputs
                return vecname, vec

            vec = embedding.getany(pref_vecname, on_missing=missing_vecname)
            self.targetmwe2embvec[embedding.target_mwe] = vec

    def finish(self, ctxinfo):
        self.vecsum = EmbeddingVector.sum(iter(self.targetmwe2embvec.values()))

    def getvec_unnormalized(self, ctxinfo, target_mwe, warn_zero=True):
        r"""Return embedding for `target`. Returns empty if unavailable."""
        assert isinstance(target_mwe, tuple)
        try:
            return self.targetmwe2embvec[target_mwe]
        except KeyError:            
            if warn_zero:
                ctxinfo.warn("Vector for `{target_mwe}` not found; using zero",
                        target_mwe="_".join(target_mwe))
            return EmbeddingVector()

    def getvec(self, ctxinfo, target_mwe, warn_zero=True):
        r"""Same as `self.get_unnormalized(...)`, but normalizes, if requested."""
        ret = self.getvec_unnormalized(ctxinfo, target_mwe, warn_zero=warn_zero)
        if normalize_input:
            ret = ret.normalized()
        return ret


################################################################################

class CompositionalityAdderHandler(filetype.ChainedInputHandler):
    r"""For each candidate, adds `compositionality`
    feature and prints candidate.
    """
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)


    def handle_meta(self, meta, ctxinfo):
        """Adds new meta-feature corresponding to the
        `compositionality` feature that we add to each candidate.
        """
        meta.add_meta_feat(MetaFeat("compositionality", "real"))
        if finding_optimal:
            meta.add_meta_feat(MetaFeat("weight", "string"))
        self.chain.handle_meta(meta, ctxinfo)


    def handle_candidate(self, candidate, ctxinfo):
        r"""Add `compositionality` feature to candidate."""
        targets = tuple(w.get_prop("lemma",w.get_prop("surface",None)) for w in candidate)
        if len(targets) < 2:
            ctxinfo.warn("Candidate `{targets}` is not multi-word", targets="_".join(targets))
        if None in targets :
            ctxinfo.error("Candidate has no lemmas nor surface forms")
        else:
            if finding_optimal:
                global vec_combin_weights
                vec_combin_weights = best_combin_weights(
                        ctxinfo, embeddings_set, targets)
            emb_combin = vec_combinator(ctxinfo, [embeddings_set \
                    .getvec(ctxinfo, (t,)) for t in targets])
            emb_composition = embeddings_set.getvec(ctxinfo, targets, warn_zero=False)

            if emb_composition.is_zero():
                composit_value = float('nan')
            else:
                if normalize_combined:
                    emb_combin = emb_combin.normalized()
                composit_value = vec_similarity(
                        ctxinfo, emb_composition, emb_combin)
            candidate.features.add("compositionality", composit_value)

            if finding_optimal:
                candidate.features.add("weight", ":".join(
                    util.portable_float2str(f) for f in vec_combin_weights))
        self.chain.handle_candidate(candidate, ctxinfo)



################################################################################

def calc_combin_weights(ctxinfo, embvectors):
    r"""Calculate the value of the combination weights for `embvectors`."""
    if vec_combin_weights is None:
        return [1] * len(embvectors)
    else:
        local_combin_weights = list(vec_combin_weights)
        n_missing = len(embvectors) - len(local_combin_weights)
        if n_missing > 0:
            distr_weight = max(0, 1.0-sum(local_combin_weights))

            if n_missing > 1:
                ctxinfo.warn("Combining {n} words, but only " \
                        "{n_weights} combination-weights were given\n" \
                        "Equally distributing the weight `{distr_weight}` " \
                        "among remaining words",
                        n=len(embvectors), n_weights=len(local_combin_weights),
                        distr_weight=distr_weight)
            local_combin_weights.extend([distr_weight/n_missing] * n_missing)
        return local_combin_weights


def best_combin_weights(ctxinfo, embeddings_set, targets):
    r"""Return the best combination weights for `targets`."""
    def cos(v, w): return v.dotprod(w)
    v_1 = embeddings_set.getvec(ctxinfo, (targets[0],), warn_zero=False)
    v_2 = embeddings_set.getvec(ctxinfo, (targets[1],), warn_zero=False)
    v_c = embeddings_set.getvec(ctxinfo, targets, warn_zero=False)
    C_c1  = cos(v_1, v_c)
    C_c2  = cos(v_2, v_c)
    C_12  = cos(v_1, v_2)
    if C_c1 <= 0  and  C_c2 >  0:  return [0, 1]
    if C_c1 >  0  and  C_c2 <= 0:  return [1, 0]
    if C_c1 <= 0  and  C_c2 <= 0:  return [0, 0]
    a_opt = (C_c1 - C_12*C_c2) / ((C_c1 + C_c2) * (1 - C_12))
    if a_opt < 0: return [0, 1]
    if a_opt > 1: return [1, 0]
    return [a_opt, 1-a_opt]


def combinator_sum(ctxinfo, embvectors):
    r"""Add up all `embvectors`, possibly applying `vec_combin_weights`."""
    local_combin_weights = calc_combin_weights(ctxinfo, embvectors)
    return EmbeddingVector.sum(embvec.scaled_by(weight) \
            for (embvec, weight) in zip(embvectors, local_combin_weights))


NAME_TO_COMBINATOR = {
    "PointwiseSum": combinator_sum,
}


################################################################################

def similarity_cosine(ctxinfo, embvec1, embvec2):
    r"""Calculate the cosine between the two vectors."""
    return embvec1.dotprod(embvec2)


NAME_TO_SIMILARITY = {
    "Cosine": similarity_cosine,
}


################################################################################

def treat_options(opts, arg, n_arg, usage_string):
    global input_candidates_filetype_ext
    global input_embeddings_filetype_ext
    global output_filetype_ext
    global input_embedding_files
    global pref_vecname
    global finding_optimal
    global vec_combin_weights
    global vec_combinator
    global vec_similarity

    vec_combinator = combinator_sum
    vec_similarity = similarity_cosine

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--candidates-from" :
            input_candidates_filetype_ext = a
        elif o == "--embeddings-from" :
            input_embeddings_filetype_ext = a
        elif o == "--to" :
            output_filetype_ext = a
        elif o == "--find-optimal" :
            finding_optimal = True
        elif o in ("-e", "--embeddings"):
            input_embedding_files.append(a)
        elif o in ("-V", "--vecname"):
            pref_vecname = a

        elif o == "--combinator":
            try:
                vec_combinator = NAME_TO_COMBINATOR[a]
            except KeyError:
                ctxinfo.error("Unknown combinator: " \
                        "`{combinator}`", combinator=a)

        elif o == "--similarity":
            try:
                vec_similarity = NAME_TO_SIMILARITY[a]
            except KeyError:
                ctxinfo.error("Unknown similarity measure: " \
                        "`{measure}`", measure=a)

        elif o == "--combination-weights":
            vec_combin_weights = []
            for weight_s in util.decent_str_split(a, ":"):
                try:
                    vec_combin_weights.append(float(weight_s))
                except (ValueError):
                    ctxinfo.error("Bad floating-point weight: " \
                            "`{weight}`", weight=weight_s)
        else:
            assert False, o

    if not input_embedding_files:
        ctxinfo.error("Option -e is mandatory")


################################################################################
# MAIN SCRIPT

longopts = ["candidates-from=", "embeddings-from=", "to=",
        "embeddings=", "vecname=", "combinator=", "combination-weights=",
        "similarity=", "find-optimal"]
args = util.read_options("e:V:", longopts, treat_options, -1, usage_string)

delegator_handler = filetype.DelegatorHandler()
filetype.parse(args, delegator_handler, input_candidates_filetype_ext)
embeddings_set = EmbeddingsSet(delegator_handler.handlables)
filetype.parse(input_embedding_files, embeddings_set,
        input_embeddings_filetype_ext)

delegator_handler.delegate_to(CompositionalityAdderHandler())
