mwetoolkit3
===========
*Multiword Expressions toolkit*



* Official website: http://mwetoolkit.sf.net
* Project repo: https://gitlab.com/mwetoolkit/mwetoolkit3/
* Latest release: [version 3.0](https://gitlab.com/mwetoolkit/mwetoolkit3/repository/archive.zip?ref=v3.0)
* Release date: January 11, 2018
* Authors: Carlos Ramisch, Silvio Ricardo Cordeiro, Vitor de Araujo, Sandra Castellanos
* Email: `"{usr}@{host}".format(usr="mwetoolkit",host=".".join(["gmail","com"]))`

The mwetoolkit aids in the automatic identification and extraction of [multiword 
expressions (MWEs)](https://en.wikipedia.org/wiki/Multiword_expression) from 
running text. These include idioms (*kick the bucket*), noun compounds (*cable 
car*), phrasal verbs (*take off, give up*), etc. 

Even though it focuses on multiword expresisons, the framework is quite complete 
and can be useful in any corpus-based study in computational linguistics. The 
mwetoolkit can be applied to virtually any text collection, language, and MWE 
type. It is a command-line tool written mostly in Python3. Its development 
started in 2010 as a PhD thesis but the project keeps active (see commit logs).

Up-to-date documentation and details about the tool can be found at the 
mwetoolkit website: http://mwetoolkit.sourceforge.net/

### 1) INSTALLING
    
Please refer to the [website](http://mwetoolkit.sf.net) for up-to-date 
installation instructions.

This version of the toolkit requires python3. For a legacy version supporting
python2, you can clone our [legacy repository](https://gitlab.com/mwetoolkit/mwetoolkit2-legacy/).

### 2) QUICK START
    
To install the mwetoolkit, just download it from the GIT repository using the 
following command:

    git clone --depth=1 "https://gitlab.com/mwetoolkit/mwetoolkit3.git"

As the code evolves fast, we recommend you to use the GIT version instead of old
releases. Periodically `git pull` to have access to latest improvements.

Once you have downloaded the toolkit, navigate to the main folder and run the 
command below for compiling the C libraries used by the toolkit.[^1]

    make

### 3) DOCUMENTATION

The [website](http://mwetoolkit.sf.net) contains tutorials and examples 
to get started, as well as detailed descriptions of the tools and file
formats manipulated by the toolkit.

### 4) REGRESSION TESTS
    
The `test` folder contains regression tests for most scripts. In order to test
your installation of the mwetoolkit, navigate to this folder and then call the
script `testAll.sh`

    cd test
    ./testAll.sh

Should one of the tests fail[^2], please send a copy of the output and a brief
description of your configurations (operating system, version, machine) to our
email.



[^1]: If you do not run this command, the toolkit will still work but it will use a Python version (much slower and possibly obsolete!) of the indexing and counting scripts. This may be OK for small corpora.
[^2]: Please, beware that on Mac OS some test will appear to fail when they actually succeed, the only differences being in rounding less significant digits of float numbers.
