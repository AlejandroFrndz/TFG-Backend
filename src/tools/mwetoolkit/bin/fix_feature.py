#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# fix_feature.py is part of mwetoolkit
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
    This script corrects bad feature values using given operation.
    By default, "bad" means "inexistent" or "NaN".

    For more information, call the script with no parameter and read the
    usage instructions.
"""


import math

from libs.base.candidate import Candidate
from libs.base.meta_feat import MetaFeat
from libs import util
from libs import filetype


################################################################################     
# GLOBALS     
     
usage_string = """\
Usage: {progname} -f <feat-name> OPTIONS <candidates>
Corrects inexistent/NaN feature values.

-f <feat-name> OR --feature <feat-name>
    Name of the feature to be fixed.

The <candidates> input file must be in one of the filetype
formats accepted by the `--candidates-from` switch.


OPTIONS may be:

-o <operation-name> OR --operation <operation-name>
    Replace "bad" values by the result of this operation:
    * "Zero": Uses the constant value 0.0
    * "NaN": Uses the constant value NaN
    * "Sum": Uses the sum of all "good" values (or 0.0)
    * "Average": Uses the average of all "good" values (or 0.0)

--from <input-filetype-ext>
    Force reading candidates from given file type extension.
    (By default, file type is automatically detected):
    {descriptions.input[candidates]}

--to <output-filetype-ext>
    Output new list of candidates in given filetype format
    (By default, outputs candidate in "XML" format):
    {descriptions.output[candidates]}

{common_options}
"""
input_filetype_ext = None
output_filetype_ext = None

operation = None
feat_name = None
collected_feat_values = []


################################################################################

def bad_value(value):
    r"""Return whether `value` is a "bad" value."""
    return value is None or math.isnan(value)


class FeatureCollectorHandler(filetype.InputHandler):
    r"""For each candidate, adds feature value to `collected_feat_values`."""
    def handle_candidate(self, candidate, ctxinfo):
        feat = candidate.features.get_feature(feat_name, None)
        if not bad_value(feat.value):
            collected_feat_values.append(feat.value)

    def _fallback(self, obj, ctxinfo):
        pass  # Ignore everything else


class FeatureFixerHandler(filetype.ChainedInputHandler):
    r"""For each candidate, adds feature value to `collected_feat_values`."""
    def before_file(self, fileobj, ctxinfo):
        if not self.chain:
            self.chain = self.make_printer(ctxinfo, output_filetype_ext)
        self.chain.before_file(fileobj, ctxinfo)

    def handle_candidate(self, candidate, ctxinfo):
        r"""Add `compositionality` feature to candidate."""
        feat = candidate.features.get_feature(feat_name, None)
        if bad_value(feat.value):
            candidate.features.replace_feature(
                    feat_name, operation(ctxinfo, candidate))
        self.chain.handle(candidate, ctxinfo)



################################################################################

def operation_zero(ctxinfo, candidate):
    r"""Return `0.0` for any candidate."""
    return 0.0

def operation_nan(ctxinfo, candidate):
    r"""Return `NaN` for any candidate."""
    return float("NaN")

def operation_sum(ctxinfo, candidate):
    r"""Return sum(collected_feat_values) or `0.0`."""
    return sum(collected_feat_values)

def operation_average(ctxinfo, candidate):
    r"""Return avg(collected_feat_values) or `0.0`."""
    if len(collected_feat_values) == 0: return 0.0
    return sum(collected_feat_values) / len(collected_feat_values)


NAME_TO_OPERATION = {
    "Zero": operation_zero,
    "NaN": operation_nan,
    "Sum": operation_sum,
    "Average": operation_average,
}


################################################################################

def treat_options(opts, arg, n_arg, usage_string):
    global input_filetype_ext
    global output_filetype_ext
    global feat_name
    global operation

    operation = operation_zero

    ctxinfo = util.CmdlineContextInfo(opts)
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o == "--from" :
            input_filetype_ext = a
        elif o == "--to" :
            output_filetype_ext = a
        elif o in ("-f", "--feature"):
            feat_name = a
        elif o in ("-o", "--operation"):
            operation = NAME_TO_OPERATION[a]
        else:
            assert False, o

    if feat_name is None:
        ctxinfo.error("Option -f is mandatory")


################################################################################
# MAIN SCRIPT

longopts = ["from=", "to=", "feature=", "operation="]
args = util.read_options("f:o:", longopts, treat_options, -1, usage_string)

delegator_handler = filetype.DelegatorHandler()
filetype.parse(args, delegator_handler, input_filetype_ext)

delegator_handler.delegate_to(FeatureCollectorHandler())
delegator_handler.delegate_to(FeatureFixerHandler())
