/*##############################################################################
#
# Copyright 2010-2012 Carlos Ramisch, Vitor De Araujo
#
# suffixarray.c is part of mwetoolkit
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
##############################################################################*/
#include <stdio.h>
#include "base.h"
#include "symboltable.h"
#include "suffixarray.h"

suffixarray_t *current_suffix_array;

suffixarray_t* make_suffixarray() {
	suffixarray_t *new = alloc(1, suffixarray_t);
	new->corpus = NULL;
	new->suffix = NULL;
	new->symboltable = make_symboltable();
	new->allocated = 0;
	new->used = 0;
	return new;
}

void free_suffixarray(suffixarray_t *suf) {
	free(suf->corpus);
	free(suf->suffix);
	free_symboltable(suf->symboltable);
	free(suf);
}

void suffixarray_append_word(suffixarray_t *suf, symbolname_t word) {
	if (suf->used >= suf->allocated) {
		resize_alloc(suf->corpus,
		             suf->allocated + SUFFIX_ARRAY_ALLOC_CHUNK,
		             symbolnumber_t);
		resize_alloc(suf->suffix,
		             suf->allocated + SUFFIX_ARRAY_ALLOC_CHUNK,
		             position_t);
		suf->allocated += SUFFIX_ARRAY_ALLOC_CHUNK;
	}

	symbolnumber_t symnum = intern_symbol(suf->symboltable, word);
	suf->corpus[suf->used] = symnum;
	// suf->suffix[suf->used] = suf->used;
	suf->used++;
}

int suffixarray_compare(suffixarray_t *suf, position_t pos1, position_t pos2) {
	position_t limit = suf->used;
	symbolnumber_t *corpus = suf->corpus;

	while (1) {
		if (pos1>=limit) {
    		return -1;
        }
    	if (pos2>=limit) {
    		return 1;
    	}
		if (corpus[pos1] != corpus[pos2]) {
			return corpus[pos1] - corpus[pos2];
		}
		if (corpus[pos1]==0 && corpus[pos2]==0) {
		    // We don't care about order after end-of-sentence.
		    // HOWEVER, for unit test, we have to guarantee that qsort is stable
    		// Linux qsort is stable but not Mac, we have to force it
			return pos1 - pos2; 
		}
		pos1++, pos2++;
	
	}

	
}

int suffixarray_compare_global(const void *ptr1, const void *ptr2) {
	return suffixarray_compare(current_suffix_array, *(position_t *)ptr1, *(position_t *)ptr2);
}

void suffixarray_sort(suffixarray_t *suf) {
	position_t i;
	current_suffix_array = suf;
	for (i=0; i < suf->used; i++)
		suf->suffix[i] = i;
	qsort(suf->suffix, suf->used, sizeof(position_t), suffixarray_compare_global);
}

void read_suffix_array(suffixarray_t *suf, FILE *corpusfile, FILE *suffixfile) {
	position_t nread1;//nread2;
	while (1) {
		suf->allocated += SUFFIX_ARRAY_ALLOC_CHUNK;
		resize_alloc(suf->corpus, suf->allocated, symbolnumber_t);
		resize_alloc(suf->suffix, suf->allocated, position_t);
		nread1 = fread(corpusfile, sizeof(symbolnumber_t), SUFFIX_ARRAY_ALLOC_CHUNK, corpusfile);
		         fread(suffixfile, sizeof(position_t), SUFFIX_ARRAY_ALLOC_CHUNK, suffixfile);
		suf->used += nread1;
		if (nread1 < SUFFIX_ARRAY_ALLOC_CHUNK)
			break;
	}
}

void write_suffix_array(suffixarray_t *suf, FILE *corpusfile, FILE *suffixfile) {
	fwrite(suf->corpus, sizeof(symbolnumber_t), suf->used, corpusfile);
	fwrite(suf->suffix, sizeof(position_t), suf->used, suffixfile);
}

void load_suffix_array(suffixarray_t *suf, char *basepath) {
	char corpuspath[strlen(basepath) + 7 + 1];
	char suffixpath[strlen(basepath) + 7 + 1];

	strcpy(corpuspath, basepath);
	strcat(corpuspath, ".corpus");
	strcpy(suffixpath, basepath);
	strcat(suffixpath, ".suffix");

	FILE *corpusfile = fopen(corpuspath, "r");
	FILE *suffixfile = fopen(suffixpath, "r");
	if (!corpusfile || !suffixfile)
		error("-- Error opening corpus/suffix file for reading!\n");
	read_suffix_array(suf, corpusfile, suffixfile);
	fclose(corpusfile);
	fclose(suffixfile);
}

void save_suffix_array(suffixarray_t *suf, char *basepath) {
	char corpuspath[strlen(basepath) + 7 + 1];
	char suffixpath[strlen(basepath) + 7 + 1];

	strcpy(corpuspath, basepath);
	strcat(corpuspath, ".corpus");
	strcpy(suffixpath, basepath);
	strcat(suffixpath, ".suffix");

	FILE *corpusfile = fopen(corpuspath, "w");
	FILE *suffixfile = fopen(suffixpath, "w");
	if (!corpusfile || !suffixfile)
		error("-- Error opening corpus/suffix file for reading!\n");
	write_suffix_array(suf, corpusfile, suffixfile);
	fclose(corpusfile);
	fclose(suffixfile);
}

