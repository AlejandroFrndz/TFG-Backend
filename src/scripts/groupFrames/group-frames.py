#!/usr/bin/env python3

import sys
import pdb

I_N1=1
I_TR1=2
I_SC1=3
I_V=4
I_DOMAIN=5
I_N2=6
I_TR2=7
I_SC2=8
#I_FRAME=9

if len(sys.argv) != 3 :
  print("Usage: {} FORMAT TABLE".format(sys.argv[0]), file=sys.stderr)
  print("  FORMAT must be one of {tsv,txt} depending on the chosen output format", file=sys.stderr)
  print("  TABLE must be a tsv file containing the frame annotation", file=sys.stderr)  
  sys.exit(-1)

frames = {}
li=0
ierr = 0
for line in open(sys.argv[2],encoding="latin-1"):
  if "?" in line : # and frame_is_number:
    ierr += 1
  elif li != 0: 
    linesplit = [ x.strip() for x in line.strip(" ").split("\t") ]
    try:
      frame_id = linesplit[I_DOMAIN].upper()+"_"+linesplit[I_TR1].upper()+"_"+linesplit[I_SC1].upper()+"_"+linesplit[I_TR2].upper()+"_"+linesplit[I_SC2].upper()
      one_frame = frames.get(frame_id,{"n1":set([]),"v":set([]),"n2":set([])})#,"frame":set([])})
      one_frame["n1"].add(linesplit[I_N1])
      one_frame["v"].add(linesplit[I_V])        
      one_frame["n2"].add(linesplit[I_N2])
      #  one_frame["frame"].add(linesplit[I_FRAME])    
      frames[frame_id]=one_frame
    except Exception:
      pdb.set_trace()
  li=li+1 # line counter

for i,f in enumerate(sorted(frames.keys())):
  (dom,tr1,sc1,tr2,sc2) = f.split("_")
  if sys.argv[1].lower() == "tsv" :
    outline = [", ".join(frames[f]["n1"]), tr1, sc1, 
               ", ".join(frames[f]["v"]), dom, 
               ", ".join(frames[f]["n2"]), tr2, sc2]
               #", ".join(frames[f]["frame"])]
    print("\t".join(outline))
  elif sys.argv[1].lower() == "txt" :
    print("\n>>> Combination {}".format(i))
    # print("\n    Frames: {}".format(", ".join((frames[f]["frame"]))))
    print("  Arg1 ({}-{}):\n    {}".format(tr1,sc1,", ".join(frames[f]["n1"])))
    print("  Verb ({}):\n    {}".format(dom,", ".join(frames[f]["v"])))    
    print("  Arg2 ({}-{}):\n    {}".format(tr2,sc2,", ".join(frames[f]["n2"])))    
  else:
    print("ERROR: unrecognized format \"{}\". Please specify \"tsv\" or \"txt\"".format(sys.argv[1]),file=sys.stderr)

if sys.argv[1].lower() == "txt" :    
  print("Accuracy of the patterns: {} relevant out of {} ({:.2f}%)".format(li-ierr,li,100*(li-ierr)/li,file=sys.stderr))
    
  
