#! /usr/bin/env python3
# -*- coding:UTF-8 -*-

################################################################################
#
# Copyright 2010-2014 Carlos Ramisch, Vitor De Araujo, Silvio Ricardo Cordeiro,
# Sandra Castellanos
#
# kappa.py is part of mwetoolkit
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
    Computes agreement coefficients like alpha, Fleiss' and Cohen's Kappas, etc.
    This script uses the terminology and definitions from:
    
    Ron Artstein and Massimo Poesio (2008). Inter-Coder Agreement for 
    Computational Linguistics. In: Computational Linguistics, 34(4):555-596. ACL
    
    The required input is a tab-separated file with the data annotation, one
    item per row, one rater/annotator per column.
"""


import sys
from libs import util


################################################################################ 
# GLOBALS  
    
NUM_DIST = {"binary":("diff(c1,c2)=0 if c1=c2, 1 else", 
                         lambda x,y: 0.0 if x == y else 1.0 ),
            "manhattan":( "diff(c1,c2)=|c2-c1| for numeric c1 and c2, 1 else",
                         lambda x,y: abs(x-y) if util.floatable(x) and \
                                                 util.floatable(y) else 1.0 ),
            "euclidean":("diff(c1,c2)=(c2-c1)^2 for numeric c1 and c2, 1 else",
                         lambda x,y: (x-y)*(x-y) if util.floatable(x) and \
                                                    util.floatable(y) else 1.0 )
            }
numeric_distance = "manhattan"
            
usage_string = """\
Usage: {progname} OPTIONS <file.txt>
Computes annotation agreement scores.

The <file.txt> file is a tab-separated file with the data annotation, one
item per row, one rater/annotator per column. Categories are treated as
enumerations, where each class is a string. If the file includes a header row 
for identifying the raters and/or a first column to identify the items, 
please specify the appropriate options --r and/or -i above. If no distance file
is provided with -d, weighted coefficients either assume all categories are
equidistant or, if they are numerical values, the default distance is the 
difference |v1-v2|.


OPTIONS may be:

-p OR --pairwise
    Additionally output pairwise coefficients like S, pi and Cohen's kappa. 
    Default false.
    
-c OR --confusion
    Additionally output, for each category, the coefficients when other 
    cantegories are collapsed, which gives an idea of its difficulty. Also 
    output a confusion matrix with the proportion of mistakes per category.
    
-r OR --raters
    First row should be considered as header with rater labels. Default false.
    
-i OR --items
    First column should be considered as header with item labels. Default false.   

-s <sep> OR --separator <sep>
    Define a character <sep> to be the field separator. Default is TAB.

-n <function-name> OR --numeric-distance <function-name>
    Use <function-name> as the function to automatically calculate the distance
    between categories in weighted agreement. Implemented functions are 
    described below. Default value: "binary" 
    """ + "\n    ".join("* \"{}\": {}".format(d[0], d[1][0]) for d in list(NUM_DIST.items())) + \
"""

-u <ukn> OR --unknown <ukn>
    WARNING: NOT TAKEN INTO ACCOUNT IN SCORES
    String <ukn> represents unknown values. This means that the data can be 
    incomplete, e.g. if a rater was not able to judge an item. Pairs including
    unknown values are not considered to calculate agreement scores. Default is 
    question mark "?"

-d OR --distances <dist-file.txt>
    Give a file containing the distances between each pair of categories. This
    allows the script to calculate alpha, weighted pairwise kappa and 
    alpha-kappa measures. The <dist-file.txt> must be a tab-separated file
    containing pairs of categories and a numeric distance value, in the form:
    category1   category2   distance
    Since the distance is simmetric, you should not specify a different distance
    for category1-category2 and category2-category1. In case you do so, only the
    last specified distance will be considered. Also, please do not specify a
    distance between a category and itself (e.g. category1-category1) since this
    will be ignored and replaced by 0. The distance can be any positive number,
    for instance, from 0.0 to 1.0, from 1 to 10, etc. Undefined distances will
    be assigned the maximum distance value of 1.0 by default.
    If this parameter is omitted, the script tries to use the difference between
    the values as distance |v1-v2| and, if they are non-numerical, falls back to
    equidistant classes (distance 1.0)
    
{common_options}
"""

ctxinfo = util.CmdlineContextInfo([])
first_header = False
first_rater = 0
calculate_pairwise = False
calculate_confusion = False
separator = "\t"
distances_matrix = {}
unknown = "?"


################################################################################

def safe_increment( dictionary, key ) :
    """
        Increments dictionary[key] by one, and initializes the value to 1 if the
        key was not present in the initial dictionary.
        
        @param dictionary Any python dict object
        @param key A key that should be incremented (can be absent from dict)
        @return The same dictionary but with position key incremented by one
    """
    entry = dictionary.get( key, 0 )
    entry = entry + 1
    dictionary[ key ] = entry
    return dictionary

################################################################################

def safe_div( f1, f2 ) :
    """
        Divides f1 by f2, but returns 1 if both values are zero.
        
        @param f1 A number
        @param f2 Another number
        @return f1/f2 float division, or 1 if both are zero
    """
    if f1 == f2 == 0 :
      return 1.0
    elif f2 == 0 :
      return float("inf")
    else :
      return float(f1) / float(f2)

################################################################################

def compute_weighted_multi( annotations, Ni, Nc, Nk ) :
    """
        Calculates weighted multi-rater coefficients alpha and alpha-kappa.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Ni The total number of items I in the data
        @param Nc The total number of raters C in the data        
        @param Nk The total number of categories K in the data
        @return A tuple with the coefficients alpha and alpha-kappa
    """
    global distances_matrix
    # The observed disagreement do is the sum over all items of the pairwise
    # distance between the annotated categories divided by the total number of
    # items Ni. The pairwise distance is 1/(total pairs) times the sum for all
    # category pairs of the product of each category count, for a given item,
    # weighted by their distance. That is, pairwise distance = 
    # 2 / (Nc x (Nc-1)) sum(k1 in K)(k2 in K) distance(k1,k2) x n_i_k1 x n_i_k2
    # In the final form, we ignore the 2 factor since it will disappear when
    # dividing by de, so that do = 1 / Ni x sum(i in I) 1 / (Nc x (Nc-1)) x
    # sum(k1 in K) sum(k2 in K) n_i_k1 x n_i_k2 x distance(k1,k2)
    do = 0.0
    for annot_row in annotations :
        for k1 in range(Nk) :
            for k2 in range(Nk) :
                d_k1_k2 = distances_matrix[k1][k2]
                do = do + d_k1_k2 * annot_row.count(k1) * annot_row.count(k2)
    do = do / (Ni * Nc * ( Nc - 1 ))
    # The expected disagreement for alpha is calculated on a category basis, not
    # taking raters into account. It is simply the mean of each category pair
    # weighted by their distance, that is, de = 1 / (all pairs) x sum(k1 in K) 
    # sum(k2 in K) distance(k1,k2) x n_k1 x n_k2. Differently from do, all pairs
    # are estimated as being all possible pairs of raters Nc times items Ni 
    # taken 2 by 2, that is, 1 / (all pairs) = 2 / Ni x Nc x ( Ni x Nc - 1 ) and
    # de = 1 / Ni x Nc x ( Ni x Nc - 1 ) sum(k1 in K) sum(k2 in K) n_k1 x n_k2 x
    # distance(k1, k2)
    de_alpha = 0.0
    # The expected disagreement for alpha-kappa is calculated on a rater basis. 
    # Therefore, it is an average over each category AND rater pair, weighted by 
    # the distance between categories, that is, de = 1 / (all k and c pairs) x 
    # sum(k1 in K) sum(k2 in K) sum(c1 c2, c1>c2) distance(k1,k2) x n_c1_k1 x 
    # n_c2_k2. The number of total pairs is 2 / i^2 for the categories and 
    # 2 / Nc x (Nc - 1) for the raters, so that de is (dividing by 2 as well):
    # de = 2 / (Ni^2 * Nc * (Nc-1)) sum(k1 in K) sum(k2 in K) sum(c1 c2, c1>c2)
    # distance(k1,k2) x n_c1_k1 x n_c2_k2
    de_alpha_kappa = 0.0
    for k1 in range(Nk) :
        n_k1 = sum( [x.count(k1) for x in annotations] )
        for k2 in range(Nk) :
            d_k1_k2 = distances_matrix[k1][k2]
            n_k2 = sum( [x.count(k2) for x in annotations] )
            de_alpha = de_alpha + d_k1_k2 * n_k1 * n_k2
            for c1 in range(Nc-1) :
                c1_list = list(map( lambda x: x[c1], annotations ))
                n_c1_k1 = c1_list.count( k1 ) 
                for c2 in range(c1+1,Nc) :
                    c2_list = list(map( lambda x: x[c2], annotations ))
                    n_c2_k2 = c2_list.count( k2 )                
                    de_alpha_kappa = de_alpha_kappa + d_k1_k2*n_c1_k1*n_c2_k2
    de_alpha = de_alpha / (Ni * Nc * (Ni * Nc - 1) )
    de_alpha_kappa = (2 * de_alpha_kappa) / ( Ni * Ni * Nc * (Nc - 1) )
    # Agreement is 1 - disagreement, which in turn is observed over expected
    alpha, alpha_kappa = [1 - do/de for de in (de_alpha, de_alpha_kappa)]
    return (alpha, alpha_kappa)

################################################################################

def compute_weighted_kappa( rater1, rater2, Ni, Nk ) :
    """
        Calculates the weighted kappa measure for two raters.
        
        @param rater1 A sorted list with Ni category IDs assigned by rater1
        @param rater2 A sorted list with Ni category IDs assigned by rater2
        @param Ni The total number of items I in the data
        @param Nk The total number of categories K in the data        
        @return The weighted kappa value
    """
    global distances_matrix
    max_distance = 0.0
    # In the case of weighted kappa, the agreement is the mean over all items of
    # the distance between the ratings of the two raters, normalized by the max
    # distance
    do = 0.0
    for k1, k2 in zip(rater1, rater2) :
        d_k1_k2 = distances_matrix[ k1 ][ k2 ]
        do = do + d_k1_k2
        if d_k1_k2 > max_distance :
            max_distance = d_k1_k2
    if max_distance > 0.0 :
      do = do / (max_distance * Ni)
    # de is estimated from each rater's distribution of categories, that is, for
    # each category pair, multiply the number of times the raters chose that 
    # category pair times the distance between the categories. In other words, 
    # de = 1 / dmax x 1 / i^2 sum(k1 in K)sum(k2 in K) n_c1_k1 x n_c2_k2 x
    # distance(k1,k2)
    de = 0.0
    for k1 in range(Nk) :
        n_c1_k1 = rater1.count( k1 )    
        for k2 in range(Nk) :
            n_c2_k2 = rater2.count( k2 )
            de = de + distances_matrix[k1][k2] * n_c1_k1 * n_c2_k2    
    de = safe_div( de, Ni * Ni * max_distance )    
    w_kappa = 1.0 - ( do / de )
    return w_kappa
        
################################################################################

def compute_pairwise( rater1, rater2, Ni, Nk ):
    """ 
        Computes five agreement coefficients for a pair of raters. The 
        calculated coefficients are ao (percentage of agreement, not chance-
        corrected) and the chance-corrected coefficients S, pi, Cohen's kappa
        and weighted Cohen's kappa as defined in Artstein and Poesio's article.
        
        @param rater1 A sorted list with Ni category IDs assigned by rater1
        @param rater2 A sorted list with Ni category IDs assigned by rater2
        @param Ni The total number of items I in the data
        @param Nk The total number of categories K in the data
        @return A tuple containing the coefficients ao, S, pi, kappa and w_kappa
    """
    global unknown
    categ_matrix = create_categ_matrix( rater1, rater2, Nk )
    ao = 0.0
    for i in range( Nk ) :
        ao = ao + categ_matrix[ i ][ i ]
    ao = ao / Ni
    # The chance estimate for pi is the joint distribution of the categories, 
    # nk / (2 x Ni), that is, the number of times a class was chosen by any 
    # rater divided by the number of ratings by both raters (2 x Ni). When 
    # summing for all categories in K the joint estimate for the raters, we have
    # sum(k in K) nk^2 / (2 x Ni)^2 = 1 / ( 4 x Ni^2 ) x sum(k in K) nk^2.
    # This is why we calculate sumSquareNk below
    ae_pi = 0.0
    # The chance estimate for kappa is similar, except that instead of summing
    # The category counts for each rater and dividing it by 2, it considers both
    # rater distributions separately, that is, ( n_c1_k / i ) * ( n_c2_k / i ).
    # Therefore, we also calculate below the product n_c1_k * n_c2_k for each k.
    ae_kappa = 0.0
    for k in range(Nk) :
        sum_rows = sum( categ_matrix[ k ] ) #Sum over the rows of category k
        # Sum over the columns of category k
        sum_columns = sum( [x[k] for x in categ_matrix] )        
        sum_categ_k = sum_rows + sum_columns  
        ae_pi = ae_pi + (sum_categ_k) * (sum_categ_k) # Add square
        ae_kappa = ae_kappa + sum_columns * sum_rows
    # The chance estimate for S is uniform, i.e. 1/k  
    ae_S = 1.0 / Nk        
    ae_pi = ae_pi / ( 4.0 * Ni * Ni ) 
    ae_kappa = ae_kappa / ( Ni * Ni )    
    (S, pi, kappa) = [safe_div(ao-ae,1.0-ae) for ae in (ae_S, ae_pi, ae_kappa)]
    w_kappa = compute_weighted_kappa( rater1, rater2, Ni, Nk )
    #if w_kappa :
    return (ao, S, pi, kappa, w_kappa)
    #else :
    #    return (ao, S, pi, kappa )    
    
################################################################################    

def compute_pairwise_all( annotations, Ni, Nc, Nk ):
    """
        Calculates measures ao, S, pi and kappa for each pair of annotators.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Ni The total number of items I in the data
        @param Nc The total number of raters C in the data        
        @param Nk The total number of categories K in the data
        @return A map in which the keys are in the form "rater1-rater2" and the
        values are the tuple ao, S, pi, kappa and w_kappa for that pair.
    """
    pairwise_map = {}
    for rater1 in range(Nc) :
        rater1_annot = [x[ rater1 ] for x in annotations]
        for rater2 in range(rater1+1,Nc) :
            rater2_annot = [x[ rater2 ] for x in annotations]
            coeffs = compute_pairwise( rater1_annot, rater2_annot, Ni, Nk )
            pairwise_map[ (rater1, rater2) ] = coeffs
    return pairwise_map

################################################################################

def compute_confusion( annotations, Nc ) :
    """
        Calculates the confusion matrix containing the counts of each annotation
        pair. That is, for each item, generate the pairs of ratings ki,kj with
        i < j, and count them.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Nc The total number of raters C in the data        
        @return A tuple. The first element contains the confusion matrix in form
        of a dictionary, with the keys being pairs of category IDs in the form
        "categ1-categ2", and the values being the counts of that pair. The 
        second element in the tuple is another dictionary containing, for each
        category (key) the number of times it was assigned in the data set.
    """    
    all_pairs = {}
    annot_counter = {}
    for annot in annotations :
        for c1 in range( Nc ) :
            a1 = annot[ c1 ]
            safe_increment( annot_counter, a1 )          
            for c2 in range( c1 + 1, Nc ) :
                a2 = annot[ c2 ]
                pair = tuple([str(x) for x in sorted((a1, a2))])
                safe_increment( all_pairs, pair )
    return ( all_pairs, annot_counter )
    
################################################################################

def compute_multi( annotations, Ni, Nc, Nk ) :
    """
        Calculates measures multi-ao, multi-pi (Fleiss' kappa) and multi-kappa 
        for all the annotators globally.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Ni The total number of items I in the data
        @param Nc The total number of raters C in the data        
        @param Nk The total number of categories K in the data
        @return A tuple multi-ao, multi-pi and multi-kappa for the data.    
    """
    annot_matrix = create_annot_matrix( annotations, Nk )
    ao = 0.0
    # ao is the number of agreeing pairs over all possible pairs
    for item in annot_matrix :
        ao = ao + sum( [x * (x-1) for x in item] )
    ao = ao / (Ni * Nc * (Nc - 1) ) 
    # For multi-pi (called generally Fleiss' kappa), we estimate ae from the
    # overall distribution of the categories. The probability of a coder chosing
    # a category by chance is the number of times the category was chosen n_k
    # over the total number of judgements Ni * Nc. If we assume that two coders
    # make a random assignment independently, then ae_pi is the sum for all
    # categories of the probability of two coders chosing the same class, that
    # is, ae_pi = sum(k in K) ( n_k / (Ni x Nc) )^2 = 1/(Ni x Nc) * sum(k in K)
    # n_k^2
    ae_pi = 0.0
    # For multi-kappa, the distribution of categories is considered individually
    # on a per rater basis. Therefore, we need to know the distributions for 
    # each rater and cannot use annot_matrix. We calculate the probability of a
    # rater c assigning a category k by counting the number of times it assigned
    # it n_c_k over the total number of assignments by this rater Ni. Therefore,
    # ae_kappa is the mean of this probability for each pair of raters, summed
    # over all categories. ae_kappa = sum(k in K) 1 / (all pairs) x sum(each 
    # pair c1 c2, c1 > c2) ( n_c1_k / Ni ) x ( n_c2_k / Ni ) = 
    # 2 / ( Ni^2 x Nc (Nc - 1) ) x sum(each pair c1 c2, c1>c2) n_c1_k x n_c2_k
    ae_kappa = 0.0
    for k in range(Nk) :
        n_k = sum( [x[k] for x in annot_matrix] )
        ae_pi = ae_pi + n_k * n_k
        for rater1 in range(Nc-1) :
            rater1_list = list(map( lambda x: x[rater1], annotations ))
            n_rater1_k = rater1_list.count( k )
            for rater2 in range(rater1+1,Nc) :
                rater2_list = list(map( lambda x: x[rater2], annotations ))
                n_rater2_k = rater2_list.count( k )
                ae_kappa = ae_kappa + n_rater1_k * n_rater2_k                
    ae_pi = ae_pi / ( (Ni * Nc) * (Ni * Nc) )
    ae_kappa = ( ae_kappa * 2.0 ) / (Ni * Ni * Nc * (Nc - 1) )
    (pi, kappa) = [(ao - ae)/(1.0-ae) for ae in (ae_pi, ae_kappa)]
    return ( ao, pi, kappa )
    
################################################################################

def calculate_distances( distances_map, all_categories, sorted_categ_names ) :
    """
        Generates a distances matrix from the distances map and the 
        correspondence between nominal categories and their IDs. This function
        is called just after reading the data when a distances file is provided.
        
        @param distances_map A dictionary where the keys are strings of the form
        (category1, category2) and the values are the distances between 
        category1 and category2
        @param all_categories A dictionary where the keys are the string nominal
        category names and the values are the integer unique IDs of each 
        category
        @param sorted_categ_names A sorted list of the category strings, sorted 
        by IDs. The IDs are assigned in lexicographic sorting order of category 
        string values.
        @return A simmetric matrix Nk x Nk, with the distance between categories 
        represented in the cells. The rows and columns are indexed with the IDs
        from 0 to Nk-1, the matrix contains 0.0 in the main diagonal. The values
        not specified in the distances_map are set to the maximum distance seen
        in the map by default. If no distance file is provided (distance_map is
        empty) the distances between each two different categories are 1.0.
    """
    global NUM_DIST
    global numeric_distance
    dist_function = NUM_DIST[numeric_distance][1]
    Nk = len( list(all_categories.keys()) )
    distances_matrix = []
    max_distance = 0.0
    for k in range(Nk) :
        distances_matrix.append( Nk * [-1.0] )
    for (c1,c2),distance in list(distances_map.items()) :        
      try :
        id1, id2 = all_categories[c1], all_categories[c2]
      except KeyError :
        ctxinfo.error("Distance file incompatible with annotations\n" \
                      "Did not find categories ({c1!r}, {c2!r}) in the " \
                      "annotation data", c1=c1, c2=c2)
      if c1 == c2 :
        ctxinfo.warn("Input defines distance between category {category} "\
                     "and itself. Replacing by 0", category=c1)
      distances_matrix[ id1 ][ id2 ] = distance
      distances_matrix[ id2 ][ id1 ] = distance
      if distance > max_distance :
        max_distance = distance
    if len( list(distances_map.keys()) ) == 0 :        
      max_distance = 1.0
    # Fill in the non-specified distances with difference (if categories are 
    # numbers) or the maximal value
    for id1 in range(Nk) :
      distances_matrix[id1][id1] = 0.0 # Distance between categ and itself = 0
      for id2 in range(Nk) :
        if distances_matrix[ id1 ][ id2 ] < 0.0 : #Not specified or negative
          c1 = sorted_categ_names[id1]
          c2 = sorted_categ_names[id2]            
          try :                  
            distances_matrix[id1][id2] = dist_function(float(c1),float(c2))
            util.verbose("Default distance between {} and {}: {}".format(
                          c1,c2,distances_matrix[ id1 ][ id2 ]))
          except ValueError:
            ctxinfo.warn("Default distance between {} and {}: {}".format(
                          c1,c2,max_distance))
            distances_matrix[ id1 ][ id2 ] = max_distance # Non-numerical
    
    return distances_matrix

################################################################################        

def categories_to_ids( annotations, all_categories ) :
    """
        Converts an annotation table with nominal categories into an equivalent
        representation where each nominal category is replaced by a unique 
        integer ID. This makes it easier to map a category to a table row/column
        and is required to calculate pairwise agreement.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param all_categories A map in which each category occurring in the data
        is a key mapping to the integer 1. This is simply a way to represent all
        the categories without repetition, that is, the set K.
        @return A tuple. The first element is a table equivalent to annotations,
        but in which instead of strings each cell contains a unique integer ID 
        for each category. The second element is a sorted list of the category
        strings, sorted by IDs. The IDs are assigned in lexicographic sorting
        order of category string values.
    """
    global distances_matrix
    # A unique position identifier for each category, so that each category is
    # mapped to a list index
    category_id = 0
    # Needs to be sorted otherwise order of columns could be different
    sorted_categ_names = sorted(all_categories.keys())
    for category in sorted_categ_names :
        if category == unknown : #Represent incomplete data (rater cannot judge)
            all_categories[ category ] = -1 # represented as -1
        else :
            all_categories[ category ] = category_id
            category_id = category_id + 1
    new_annotations = []
    for annot_row in annotations :
        new_annot_row = []
        for annotation in annot_row :
            new_annot_row.append( all_categories[ annotation ] )
        new_annotations.append( new_annot_row )   
    #pdb.set_trace()
    if unknown in list(all_categories.keys()) :
      del(all_categories[unknown])   
      sorted_categ_names = sorted(all_categories.keys()) 
    distances_matrix = calculate_distances(distances_matrix, all_categories,
                                           sorted_categ_names)

    return (new_annotations, sorted_categ_names)
      
################################################################################

def create_categ_matrix( rater1, rater2, Nk ) :
    """
        Given the annotations for two raters rater1 and rater2, creates a matrix
        with Nk x Nk cells, where each cell (i1,i2) contains the count of the 
        number of times rater1 assigned k_i1 and rater2 assigned k_i2. The sum 
        of the cell values equals Ni, the sum of the cell values on the main 
        diagonal is the number of cases on which both raters agree.
        
        @param rater1 A sorted list with Ni category IDs assigned by rater1
        @param rater2 A sorted list with Ni category IDs assigned by rater2
        @param Nk The total number of categories K in the data
        @return A matrix with Nk rows and Nk columns containing the joint 
        distribution of ratings between rater1 and rater2
    """
    categ_matrix = Nk * [ [] ]
    for i in range( Nk ) :
        categ_matrix[ i ] = Nk * [0] # Builds a zero matrix Nk x Nk
    for ( i1, i2 ) in zip( rater1, rater2 ) : # Run through both lists
        if i1 != -1 and i2 != -1 : # not unknown
          categ_matrix[ i1 ][ i2 ] = categ_matrix[ i1 ][ i2 ] + 1 # Increment
    return categ_matrix

################################################################################

def create_annot_matrix( annotations, Nk ) :
    """
        Creates an annotation matrix, that is, a matrix with Ni rows (one per
        item) and Nk columns, in which the cells contain the count of how many
        annotators chose the category k for a given item i. The sum on the rows
        of this matrix must equal Nc for all rows.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Nk The total number of categories K in the data
        @return A matrix with one subject per row, one category per column, and
        the counts of how many raters chose each category for a column.
    """
    # Count the number of annotators who assigned a given category to an item i
    annot_matrix = []
    for annotation in annotations :
        annot_matrix_row = Nk * [0]
        for annot_i in annotation :
            annot_matrix_row[ annot_i ] = annot_matrix_row[ annot_i ] + 1
        annot_matrix.append( annot_matrix_row )
    return annot_matrix   
   
################################################################################

def read_distances( d_filename ) :
    """
        Reads the distances between categories from a tab-separated file and 
        generates a list of tuples which will, once the annotation file is 
        read, be converted into a category x category matrix. This needs to be
        done like this because, before reading the annotations file, we do not
        know how many categories Nk will be used. 
        
        @param d_filename The input file name from which the data is read
        @return A list of tuples containing, in the first position, category 1,
        in the second position, category 2, and in the third position a float
        with the distance between them.
    """
    try :
        d_data = open( d_filename )
    except IOError :
        ctxinfo.error("Distance file {filename!r} " \
                "not found", filename=d_filename)

    distances_map = {} # Use a map to remove duplicates if present
    for line in d_data.readlines() :
        if len(line.strip()) > 0 : # Ignore blank lines
            line_values = line.strip().split("\t")
            try :
                cat1, cat2, distance = line_values
            except ValueError :
                ctxinfo.error("Expected 3 tab-separated values; " \
                        "found {n_values}", n_values=len(line_values))      
            distances_map[ (cat1, cat2) ] = float( distance )
    return distances_map

################################################################################

def read_data( f_data ) :
    """
        Reads the annotation data from a tab-separated file and generates a
        matrix with Ni rows, one per item to annotate, and Nc columns, one per 
        rater. The content of the matrix are the categories from K assigned 
        by coder c to item i. However, each category is converted to an integer
        unique ID from 0 to Nk-1, so that it is easier to sort the categories.
        Also returns the total number of items, raters and categories.
        
        @param f_data The input file from which the data is read
        @return A tuple containing, in the first position, the matrix with one 
        subject per row, one rater per column, and the annotation category IDs 
        in the cells as integers. The second, third and fourth fields of the 
        tuple are the number of items Ni, of coders Nc and of categories Nk. The
        fifth field is a list containing the names of the categories sorted by
        their IDs (position 0 contains the name of category IDentified by 0, and
        so on).
    """
    global first_rater
    global first_header
    global separator
    global unknown
    if first_header :
        f_data.readline() # Ignores first row   
    
    annotations = []
    all_categories = {}
    Ni = 0
    Nc = 0
    for line in f_data.readlines() :
        if len(line.strip()) > 0 : # Ignore blank lines
            Ni = Ni + 1
            annot_row = line.strip().split( separator )[first_rater:]
            if Nc == 0 :
                Nc = len( annot_row )
            elif Nc != len( annot_row ) :
                import pdb
                pdb.set_trace()
                raise ValueError("Row {}: the file must contain the same "\
                                   "number of fields in all rows".format(Ni))
            # improvement for cases where file was Space-Tab separated                                   
            clean_annot_row = [] # contains the annotation cleaned from spaces
            for annotation in annot_row :
                clean_annot = annotation.strip() # Remove spurious spaces
                #if clean_annot != unknown :
                all_categories[ clean_annot ] = 1
                clean_annot_row.append( clean_annot )          
            annotations.append( clean_annot_row )
    (annotations,categ_names) = categories_to_ids( annotations, all_categories )
    Nk = len( all_categories )
    util.verbose( "\n%d items\n%d raters\n%d categories\n" % (Ni, Nc, Nk) )
    return ( annotations, Ni, Nc, Nk, categ_names ) 

################################################################################

def print_matrix_kappa( pairwise_map, Nc ) :
    """
        Given a set of pairwise Cohen kappas, prints them in a nice matrix with
        raters versus raters agreement. This is a nice way of seeing whether one
        of the annotators consistently disagrees with the others, and which are
        the best and worst agreements, etc.
        
        @param pairwise_map A map in which the keys are in the form 
        "rater1-rater2" and the values are the tuple ao, S, pi and kappa for 
        that pair.
        @param Nc The total number of raters C in the data
    """
    matrix_kappa = []
    for i in range(Nc) :
        matrix_kappa.append( Nc * [ 0.0 ] )
    for pair in list(pairwise_map.keys()) :
        kappa = pairwise_map[ pair ][3]
        ( rater1, rater2 ) = [int(x) for x in pair]
        matrix_kappa[ rater1 ][ rater2 ] = kappa
    print("\nPairwise Cohen's kappa visualisation")
    print(Nc * 11 * "=")
    for j in range(1,Nc) :
        print("Rater%3d |" % j,end="")
    print()
    for i in range(Nc-1) :        
        for j in range(1,Nc) :
            kappa = matrix_kappa[ i ][ j ]
            if j <= i :
                print(10*" ",end="")
            else :
                print("%+.5f |" % kappa,end="")
        print("Rater %3d" % i)
    print(Nc * 11 * "=")
    
################################################################################  

def print_matrix_confusion( confusion, categ_names, counters, Ni, Nc, Nk ) :
    """
        Given a confusion matrix in form of a list, prints it in a nice matrix 
        with categories vs. categories counts. This is a nice way of seeing 
        which categories are the ones with highest/lowest disagreement and thus
        identify blurry and sharp distinctions that raters are able to make.
        
        @param confusion A map in which the keys are in the form
        "categ1-categ2" and the values are the counts of that pair
        @param Nk The total number of categories Nk in the data
        @param categ_names The list with the names of the categories ordered by
        their IDs
        @param counters The dict with the count each time a category (key) was
        assigned by a rater to an item
        @param Ni The total number of items I in the data
        @param Nc The total number of raters C in the data        
        @param Nk The total number of categories K in the data
    """
    matrix_confusion = []
    list_pair_count = []
    Npairs = 0.0
    for i in range(Nk) :
        matrix_confusion.append( Nk * [ 0 ] )
        list_pair_count.append( 0 )
    for pair in list(confusion.keys()) :
        categ_count = confusion[ pair ]
        #pdb.set_trace()
        ( categ1, categ2 ) = [int(x) for x in pair]
        matrix_confusion[ categ1 ][ categ2 ] = categ_count
        list_pair_count[ categ1 ] = list_pair_count[ categ1 ] + categ_count
        if categ1 != categ2 :
            list_pair_count[ categ2 ] = list_pair_count[ categ2 ] + categ_count        
        Npairs = Npairs + categ_count
    print("Category confusion matrix of judgement pairs")
    print( (Nk + 1) * 9 * "=")
    for j in range(Nk) :
        print("Cat{:<3} |".format(j),end="")
    print()
    for i in range(Nk) :        
        for j in range(Nk) :
            if j < i :
                print(8 * " ",end="")
            else :
                print("{:<6} |".format(matrix_confusion[ i ][ j ]),end="")
        print("Cat%3d" % i)
    print( (Nk + 1) * 9 * "=" + "\n")
    # Print the detail of agreement/disagreement proportions and category names
    print(" " * 12 + "Cat distrib |  Agree | Disagree")
    for i in range(Nk) :
        count_categ = counters[i]
        prop_agree = matrix_confusion[ i ][ i ] / list_pair_count[i]
        prop_disagree = 1 - prop_agree
        print("Cat{:<3} - {:>5} ({:.4f}) | {:.4f} | {:.4f}   ---> {}".format(i, count_categ, (count_categ/(Ni*Nc)), prop_agree, prop_disagree, categ_names[i]) )
    print()
    
    
    
###############################################################################    

def calculate_and_print( ctxinfo, annotations, Ni, Nc, Nk, categ_names ) :
    """
        Given the set of annotations read from the files, calculate the
        agreement coefficients and print them in a nice way.
        
        @param annotations The list of annotations containing one row per item,
        one column per rater, and the nominal categories in the cells
        @param Ni The total number of items I in the data
        @param Nc The total number of raters C in the data        
        @param Nk The total number of categories K in the data
        @param categ_names The names of the categories used to annotate, sorted
        by their IDs.
    """
    global calculate_pairwise
    global calculate_confusion
    if Ni != 0 and Nc != 0 and Nk != 0 : # empty file
        if calculate_pairwise :
            pairwise_map = compute_pairwise_all( annotations, Ni, Nc, Nk)
            for pair in list(pairwise_map.keys()) :
                print("\nAgreement for pair {}-{}".format(*pair))
                (a0, S, pi, kappa, wkappa) = pairwise_map[pair]
                print("ao = {}, S = {}, pi = {}, (Cohen's) kappa = {}, "
                      "weighted kappa = {}".format(a0, S, pi, kappa, wkappa) )
            print_matrix_kappa( pairwise_map, Nc )
        print( """
Nc = {} raters
Ni = {} items
Nk = {} categories
Nc x Ni = {} judgements""".format(Nc, Ni, Nk, Ni * Nc))
        if Nc == 1 :
          ctxinfo.error("Cannot calculate agreement with only 1 rater")
        coeffs = compute_multi( annotations, Ni, Nc, Nk )
        print("\nOverall agreement coefficients for all annotators:")
        print("multi-ao = %f\nmulti-pi (Fleiss' kappa) = %f\nmulti-kappa = %f\n"
              % coeffs)
        coeffs_weighted = compute_weighted_multi( annotations, Ni, Nc, Nk )
        print("Weighted agreement coefficients for all annotators:")
        print("alpha = %f\nalpha-kappa = %f\n" % coeffs_weighted)
        if calculate_confusion :
            confusion, counters = compute_confusion( annotations, Nc )
            print_matrix_confusion(confusion, categ_names, counters, Ni, Nc, Nk)
    else :
        ctxinfo.error("you probably provided an empty file")
          
################################################################################
   
def treat_options( opts, arg, n_arg, usage_string ) :
    """
        Callback function that handles the command line options of this script.
        
        @param opts The options parsed by getopts.        
        @param arg The argument list parsed by getopts.        
        @param n_arg The number of arguments expected for this script.        
        @param usage_string The usage string printed if the arguments are wrong.        
    """
    
    global first_header
    global first_rater
    global calculate_pairwise
    global calculate_confusion
    global separator
    global distances_matrix
    global numeric_distance
    global unknown
    
    util.treat_options_simplest(opts, arg, n_arg, usage_string)

    for o, a in ctxinfo.iter(opts):
        if o in ("-r", "--raters") :
            util.verbose( "First row in file ignored -> considered as rater labels")
            first_header = True     
        if o in ("-i", "--items") : 
            util.verbose("First column in file ignored -> considered as item labels")        
            first_rater = 1 
        if o in ("-p", "--pairwise") : 
            util.verbose( "Computing pairwise coefficients" )
            calculate_pairwise = True
        if o in ("-n", "--numeric-distance") : 
            if a not in list(NUM_DIST.keys()) :
                ctxinfo.warn("Unrecognised numeric distance! Weighted "\
                             "coefficients will use manhattan as default")
            else :
                util.verbose( "Considering distance between categories : " + a )
                numeric_distance = a
        if o in ("-u", "--unknown") : 
            util.verbose( "Unknown value - TODO: implement: " + a )
            unknown = a            
        if o in ("-s", "--separator") : 
            util.verbose( "Field separator: " + a )
            separator = a
            if len( separator ) > 1 :
                ctxinfo.warn("Multi-char field separator!")
        if o in ("-d", "--distance") :
            util.verbose("Calculating weighted coefficients using distance file")
            distances_matrix = read_distances( a )
            if distances_matrix is None :
                ctxinfo.warn("Error in distance matrix! Weighted coefficients will use 1.0 as default distance")
        if o in ("-c", "--confusion") :
            util.verbose( "Calculating confusion matrices" )
            calculate_confusion = True

################################################################################     
# MAIN SCRIPT

longopts = [ "raters", "items", "pairwise", "separator=", "distance=",
              "confusion", "unknown=", "numeric-distance=" ]
arg = util.read_options( "rips:d:cu:n:", longopts, treat_options, -1, usage_string )   

if len( arg ) == 0 :
    (annotations, Ni, Nc, Nk, categ_names) = read_data( sys.stdin )
    calculate_and_print( ctxinfo, annotations, Ni, Nc, Nk, categ_names )
else :
    for a in arg :
        input_file = open( a )
        (annotations, Ni, Nc, Nk, categ_names) = read_data( input_file )
        calculate_and_print( ctxinfo, annotations, Ni, Nc, Nk, categ_names )
