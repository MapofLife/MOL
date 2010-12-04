from google.appengine.ext import db
import cgi, logging, png, copy, math
from django.utils import simplejson

from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api.labs import taskqueue
from google.appengine.api import memcache
from google.appengine.ext.webapp import template
from google.appengine.api import images
from google.appengine.api import quota

from mapreduce import control as mr_control 

import os, string, Cookie, sha, time, random, cgi
import urllib, datetime, cStringIO, pickle,random
import wsgiref.handlers
import cStringIO, png

from mol.db import *


    
bEncode = {
    0 : 'A' , 16 : 'Q' , 32 : 'g' , 48 : 'w' ,
    1 : 'B' , 17 : 'R' , 33 : 'h' , 49 : 'x' ,
    2 : 'C' , 18 : 'S' , 34 : 'i' , 50 : 'y' ,
    3 : 'D' , 19 : 'T' , 35 : 'j' , 51 : 'z' ,
    4 : 'E' , 20 : 'U' , 36 : 'k' , 52 : '0' ,
    5 : 'F' , 21 : 'V' , 37 : 'l' , 53 : '1' ,
    6 : 'G' , 22 : 'W' , 38 : 'm' , 54 : '2' ,
    7 : 'H' , 23 : 'X' , 39 : 'n' , 55 : '3' ,
    8 : 'I' , 24 : 'Y' , 40 : 'o' , 56 : '4' ,
    9 : 'J' , 25 : 'Z' , 41 : 'p' , 57 : '5' ,
    10 : 'K' , 26 : 'a' , 42 : 'q' , 58 : '6' ,
    11 : 'L' , 27 : 'b' , 43 : 'r' , 59 : '7' ,
    12 : 'M' , 28 : 'c' , 44 : 's' , 60 : '8' ,
    13 : 'N' , 29 : 'd' , 45 : 't' , 61 : '9' ,
    14 : 'O' , 30 : 'e' , 46 : 'u' , 62 : '+' ,
    15 : 'P' , 31 : 'f' , 47 : 'v' , 63 : '/' }

bDecode = {'+': '111110', '/': '111111', '1': '110101', '0': '110100', '3': '110111', '2': '110110', '5': '111001', '4': '111000', '7': '111011', '6': '111010', '9': '111101', '8': '111100', 'A': '000000', 'C': '000010', 'B': '000001', 'E': '000100', 'D': '000011', 'G': '000110', 'F': '000101', 'I': '001000', 'H': '000111', 'K': '001010', 'J': '001001', 'M': '001100', 'L': '001011', 'O': '001110', 'N': '001101', 'Q': '010000', 'P': '001111', 'S': '010010', 'R': '010001', 'U': '010100', 'T': '010011', 'W': '010110', 'V': '010101', 'Y': '011000', 'X': '010111', 'Z': '011001', 'a': '011010', 'c': '011100', 'b': '011011', 'e': '011110', 'd': '011101', 'g': '100000', 'f': '011111', 'i': '100010', 'h': '100001', 'k': '100100', 'j': '100011', 'm': '100110', 'l': '100101', 'o': '101000', 'n': '100111', 'q': '101010', 'p': '101001', 's': '101100', 'r': '101011', 'u': '101110', 't': '101101', 'w': '110000', 'v': '101111', 'y': '110010', 'x': '110001', 'z': '110011'}

class Updates(webapp.RequestHandler):
  def post(self):
    self.get()
  def get(self):
    now = time.time()
    seed = int(now)
    #if it is kicked of by the cron, create 10 tasks
    query = TileUpdate.all(keys_only=True)
    #if cursor is not None:
    #    query.with_cursor(cursor)
    changed = query.fetch(90)
    #cursor = query.cursor()
    for c in changed:
        k = c.name()
        k = k.split("/")
        #make sure it isn't a 0 level tile
        if len(k[1]) > 1:
            #remove the last number in the quadid to get the quadid of the lower resolution tile that owns it
            k[1] = k[1][:-1]
            #put the array back together
            k = '/'.join(k)
            #if task for this key already exists, it will fail
            name = k.split('/')
            name = "%s-%s-%d" % (name[0],name[1],int(now/10))
            try:
                
                taskqueue.add(
                    url='/cron/interpolate/tiles',
                    params={'k': k, 'seed': seed},
                    name = '%s' % name,
                    eta = datetime.datetime.utcfromtimestamp(now) + datetime.timedelta(seconds=3))
                #logging.error(k)
            except:
                pass
                #logging.error('new tileupdates failed: %s' % inst)
            
    
      

class InterpolateTile(webapp.RequestHandler):
  def get(self):
    self.post()
  def post(self):
      
    #from now on, assume the key sent was k="01"
    key = self.request.params.get('k', None)
    seed = self.request.params.get('seed', int(time.time()/15))
    now = time.time()
    #logging.error(key)
    bands = []
    
    #we just want a list with a '0' pixel place holder for every pixel in a 256x256 PNG
    n = "0" * 65538
    n = list(n)
    
    delList = []
    #the way that quadtree logic works, is that every tile of 256x256, is quartered
    #into 4 equal tiles when you zoom into it. The naming is super simple and nice
    #at zoom 0, there is 1 tile, with an id= 0
    #if you then zoom in, there are 4 tiles: 00, 01, 02, 03
    #so given a key of 0, we know that we have to group together all the information
    #from 00,01,02,03 to make the courser tile, hence the loop below
    for qt in range(4): #get all four tiles that make up the greater tile
        #just because I started naming the keys, with specid/quadid/type
        #i need to change that quadid so I can grab the tile from the datastore
        tmpK = key.split("/")
        tmpK[1] = tmpK[1]+str(qt)
        tmpK = '/'.join(tmpK)
        
        #delete record if it is in the TileUpdate kind
        delList.append(db.Key.from_path('TileUpdate',tmpK))
        
        #grab it
        t = TmpTile.get(db.Key.from_path('TmpTile',"%s" % (tmpK)))
        #if there was no tile, it means that is an empty quarter of the tile we are creating, that is nice
        if t:
                
            #we need to do something kinda not obvious here
            #if the quad is 1 (top right) or 3 (bottom right)
            #we need to offset all column entries by 128
            oct = 0 if qt in [0,2] else 128
            #same if it is 2 or 3, we need to offset all rows by
            #128. This is to allow for each tile to fill up one
            #quarter of the new zoomed out tile (which is 256 in each direction)
            orow = 0 if qt in [0,1] else 128
            
            b = ''
            ct = 0
            #convert all the letters in the stored band back into a string of '1's and '0's
            ct = 0
            row = 0
            skip = True
            for b in t.band:
                #whoa that was complicated before, sorry, fixed
                for c in bDecode[b]:
                    if c != '0': #if the data is '0' we can skip anything, since '0' was the default in the n string we created above
                        u = int((math.floor(row/2)+orow)*256 + math.floor(ct/2) + oct)
                        n[u] = c
                    ct += 1
                    if ct > 255:
                        row+=1
                        ct = 0
                
    #this guy i got of the webs, it just chunks a string into array of string length n, chk(str, n)
    #chk = lambda v, l: [v[i*l:(i+1)*l] for i in range(int(math.ceil(len(v)/float(l))))]
        
    #logging.error(len(n))
    #tmp = ''.join(n)
    #tmp = chk(tmp,6)
    out = ''
    ct = 0
    id = 0
    #re-encode the byte string into our character string
    while id < len(n):
        ct+=1
        out += bEncode[int(''.join(n[id:(id+6)]),2)]
        id+=6
        
    #delete any tiles processed above
    db.delete(delList)
    
    #and store
    putList = []
    tmp = TmpTile(key=db.Key.from_path('TmpTile',key))
    tmp.band = db.Text(out)
    putList.append(tmp)
    tile = Tile(key=db.Key.from_path('Tile',key))
    tile.band = db.Blob(out)
    putList.append(tile)
    
    #make sure it isn't a 0 level tile
    if len(key.split("/")[1]) > 1:
        up = TileUpdate(key=db.Key.from_path('TileUpdate',key))
        putList.append(up)
    
    db.put(putList)
    
    #if task for this key already exists but hasn't executed, it will fail
    try:
        taskqueue.add(
            url='/cron/tileupdates',
            name = '%s-%s-%s' % (10,10,seed),
            eta = datetime.datetime.utcfromtimestamp(now) + datetime.timedelta(seconds=3))
        #logging.error(cursor)
    except:
        #allow the fail to happen quietly
        pass
    
       
    
application = webapp.WSGIApplication(
         [('/cron/tileupdates', Updates),
         ('/cron/interpolate/tiles', InterpolateTile)],      
         debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
