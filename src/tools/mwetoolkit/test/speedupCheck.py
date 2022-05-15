#! /usr/bin/env python

from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import collections
import getopt
import os
import re
import shlex
import sys

FILE_ENC = "UTF-8"
HERE = os.path.dirname(os.path.realpath(__file__))


USAGE_STRING = """\
Usage: {program} [OPTIONS]

Description: Compares `last` speedup calculation against
`reference` speedup (by default, the last but one).
The output can be piped into `less -RS` for better visualization.


OPTIONS may be:

--last <last-file>
    Specify path to `last` speedup file.

--reference <ref-file>
    Specify path to `reference` speedup file.

--log-path <log-path>
    Specify path to `speedup_logs` directory.

--testlib
    Run in testlib-friendly format.
    Implies --quiet.

-q or --quiet
    Do not output assumptions and warnings.

-h or --help
    Show this error message.
"""

SHORTOPTS = "hq"
LONGOPTS = ["help", "last=", "reference=",
        "log-path=", "quiet", "testlib"]


class Main(object):
    r"""Main class for execution."""
    def __init__(self):
        self.quiet = False
        self.testlib = False
        self.logpath = "/tmp/testlib.{}/speedup_logs" \
                .format(unicode(os.getuid()))
        self.dict_last = None
        self.dict_ref = None

        try:
            optargs, _ = getopt.getopt(sys.argv[1:], SHORTOPTS, LONGOPTS)
        except getopt.GetoptError as err:
            print("ERROR: ", err, "\n", sep="", file=sys.stderr)
            self.exit_usage()

        for opt, arg in optargs:
            if opt in ("-h", "--help"):
                self.exit_usage()
            elif opt in ("-q", "--quiet"):
                self.quiet = True
            elif opt == "--log-path":
                self.logpath = arg
            elif opt == "--testlib":
                self.testlib = True
                self.quiet = True
            elif opt == "--last":
                self.dict_last = self.read_file(arg)
            elif opt == "--reference":
                self.dict_ref = self.read_file(arg)
            else:
                assert False, opt

        try:
            sorted_files = sorted(os.listdir(self.logpath))
            if not self.dict_last:
                path_last = os.path.join(self.logpath, sorted_files[-1])
                self.assumption("last =", path_last)
                self.dict_last = self.read_file(path_last)
            if not self.dict_ref:
                path_ref = os.path.join(self.logpath, sorted_files[-2])
                self.assumption("reference =", path_ref)
                self.dict_ref = self.read_file(path_ref)
        except (OSError, IndexError):
            if not self.testlib:
                raise  # If not testlib, propagate exception
            exit(0)  # If testlib, exit completely silently

    def assumption(self, *args, **kwargs):
        r"""Print given assumption."""
        if not self.quiet:
            print("Assuming", *args, file=sys.stderr, **kwargs)

    @staticmethod
    def exit_usage():
        r"""Print usage message and exit."""
        print(USAGE_STRING.format(program=__file__),
                file=sys.stderr)
        sys.exit(1)

    def run(self):
        speedup_list = []
        self.normal_output(["t_ref", "t_last", "speedup", "command"])
        for command, runtime_ref in self.dict_ref.iteritems():
            try:
                runtime_last = self.dict_last[command]
            except KeyError:
                continue

            # Adjust by up to MAGIC secs to compensate for low accuracy
            MAGIC = 0.008
            adj = min(MAGIC, abs(runtime_ref-runtime_last))
            runtime_last += adj * cmp(runtime_ref, runtime_last)

            speedup = runtime_ref / runtime_last
            speedup_list.append(speedup)
            command = shlex.split(command)
            command[0] = os.path.relpath(command[0])
            command = " ".join(command)
            if sys.stdout.isatty():
                command = command[:int(os.environ.get("COLUMNS", 80)) - 3*8]
            self.normal_output([runtime_ref, runtime_last,
                    ascii_colored(speedup), command])

        self.testlib_output("\u001B[30m")
        print("\n+" + "-"*32 + "+")
        print("| Comparing last two executions  |")
        print("| Mean speedup (geometric): ",
                ascii_colored(geom_mean(speedup_list)), " |", sep="")
        print("| Mean speedup (harmonic):  ",
                ascii_colored(harmonic_mean(speedup_list)), " |", sep="")
        print("+" + "-"*32, "+", sep="")
        self.testlib_output("\u001B[m")


    def testlib_output(self, string):
        if self.testlib:
            print(string, end="")

    def normal_output(self, args):
        if not self.testlib:
            print("\t".join(float2str(x) for x in args))


    def read_file(self, file_path):
        r"""Read file and return a dict `command -> runtime (secs)`"""
        ret = collections.OrderedDict()
        with open(file_path, "r") as f:
            for match in re.finditer("=> (.*)\n[0-9.]+user [0-9.]+system " \
                    "0:([0-9.]+)elapsed", f.read()):
                command = shlex.split(match.group(1))[0]
                runtime = float(match.group(2))
                ret[command] = runtime
        return ret


def geom_mean(elems):
    if not elems:
        return float("nan")
    import math
    log_avg = sum(math.log(e) for e in elems) / len(elems)
    return math.exp(log_avg)

def harmonic_mean(elems):
    if not elems:
        return float("nan")
    return len(elems) / sum(1/x for x in elems)

def ascii_colored(speedup):
    error = 0.05
    if speedup < 1-error:
        return "\u001B[35m{0}\u001B[m".format(float2str(speedup))
    if speedup > 1+error:
        return "\u001B[32m{0}\u001B[m".format(float2str(speedup))
    return "{0}".format(float2str(speedup))


def float2str(number):
    if isinstance(number, float):
        return "{0:4.02f}".format(number)
    return unicode(number)


Main().run()
