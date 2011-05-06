#!/usr/bin/env python
#
# Copyright 2010 Map Of Life
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from django.utils import simplejson
from google.appengine.api import urlfetch, memcache
from google.appengine.api.datastore_errors import BadKeyError, BadArgumentError
from google.appengine.api.memcache import Client
from google.appengine.ext import webapp, db
from google.appengine.ext.db import KindError
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from gviz import gviz_api
from mol.db import Species, SpeciesIndex, TileSetIndex, Tile
from xml.etree import ElementTree as etree
import datetime
import logging
import re
import os
import pickle
import time
import wsgiref.util
import StringIO
from mol.service import MasterTermSearch
from mol.service import TileService
from mol.service import LayerService
from mol.service import GbifLayerProvider
from mol.service import LayerType
from mol.service import LayerService
from mol.service import png
from mol.service import colorPng

HTTP_STATUS_CODE_NOT_FOUND = 404
HTTP_STATUS_CODE_FORBIDDEN = 403
HTTP_STATUS_CODE_BAD_REQUEST = 400

class BaseHandler(webapp.RequestHandler):
    '''Base handler for handling common stuff like template rendering.'''

    def _param(self, name, required=True, type=str):
        # Hack (see http://code.google.com/p/googleappengine/issues/detail?id=719)
        import cgi
        params = cgi.parse_qs(self.request.body)
        if len(params) is 0:
            val = self.request.get(name, None)
        else:
            if params.has_key(name):
                val = params[name][0]
            else:
                val = None

        # val = self.request.get(name, None)
        if val is None:
            if required:
                logging.error('%s is required' % name)
                raise BadArgumentError
            return None
        try:
            return type(val)
        except (ValueError), e:
            logging.error('Invalid %s %s: %s' % (name, val, e))
            raise BadArgumentError(e)

    def render_template(self, file, template_args):
        path = os.path.join(os.path.dirname(__file__), "../../templates", file)
        self.response.out.write(template.render(path, template_args))

    def push_html(self, file):
        path = os.path.join(os.path.dirname(__file__), "../../html", file)
        self.response.out.write(open(path, 'r').read())
        
class WebAppHandler(BaseHandler):
    
    def __init__(self):
        self.master_term_search = MasterTermSearch()
        self.layer_service = LayerService()
        self.gbif = GbifLayerProvider()
        
    def get(self):
        self.post();

    def post(self):
        action = self.request.get('action', None)
        
        if not action:
            self.error(400) # Bad request
            return

        action = simplejson.loads(action)
        a_name = action.get('name')
        a_type = action.get('type')
        a_query = action.get('params')
        logging.info('name=%s, type=%s, query=%s' % (a_name, a_type, a_query))
        
        response = {
            'LayerAction': {
                'search': lambda x: self._layer_search(x),
                'get-points': lambda x: self._layer_get_points(x)
                }
            }[a_name][a_type](a_query)

        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(simplejson.dumps(response))

    def _layer_get_points(self, query):
        # TODO: Use self.layer_service()
        sciname = query.get('layerName')
        content = self.gbif.getdata({'sciname':sciname})
        logging.info(content)
        return content
        
        
    def _layer_search(self, query):
        # TODO(aaron): Merge list of profiles.
        # return self.layer_service.search(query)[0]
        term = query.get('query', 'stenocercus')
        if term in ["", None, False]:
            term = 'stenocercus'
        limit = int(query.get('limit', 50))
        offset = int(query.get('offset', 0))
        
        query = {"term": term, "limit": limit, "offset": offset}
        results = self.master_term_search.search(query)
        
        gbifnames = self.gbif.namesearch({
                                    'limit': 5,
                                    'start': 0,
                                    'sciname': term})
                
        query = {
                "search": term,
                "offset": offset,
                "limit": limit,
                }
        types = {}
        sources = {}
        layers = {}
        names = {}
        
        ct = 0
        for r in results:
            r = db.get(r)
            if r.category not in types.keys():
                types[r.category] = {"names": [],"sources": [], "layers": []}
            if r.source not in sources.keys():
                sources[r.source] = {"names": [],"types": [],"layers": []}
            if r.name.strip() not in names.keys():
                names[r.name.strip()] = {"sources": [],"types": [],"layers": []}
            
            if r.name not in types[r.category]["names"]:
                types[r.category]["names"].append(r.name)
                sources[r.source]["names"].append(r.name)
            
            if r.source not in types[r.category]["sources"]:
                types[r.category]["sources"].append(r.source)
                names[r.name.strip()]["sources"].append(r.source)
                
            if r.category not in sources[r.source]["types"]:
                sources[r.source]["types"].append(r.category)
                names[r.name.strip()]["types"].append(r.category)
                
            types[r.category]["layers"].append(ct)
            sources[r.source]["layers"].append(ct)
            names[r.name.strip()]["layers"].append(ct)
            
            layers[ct] = {
                "name": r.name,
                "name2": r.subname,
                "source": r.source,
                "type": r.category,
                "info": r.info,
                "key_name": r.key().name()
                }
            ct += 1
            
            
            #sprinkle GBIF name search results throughout
            ctg = ct%8
            if ctg==0 or ct==3:
                cur = gbifnames.pop(0)
                if 'points' not in types.keys():
                    types['points'] = {"names": [],"sources": [], "layers": []}
                if 'GBIF' not in sources.keys():
                    sources['GBIF'] = {"names": [],"types": [],"layers": []}
                if cur['name'] not in names.keys():
                    names[cur['name']] = {"sources": [],"types": [],"layers": []}
                
                if cur['category'] not in names[cur['name']]["types"]:
                    names[cur['name']]["types"].append(cur['category'])
                    sources[cur['source']]["types"].append(cur['category'])
                if cur['source'] not in types[cur['category']]["sources"]:
                    types[cur['category']]["sources"].append(cur['source'])
                    names[cur['name']]["sources"].append(cur['source'])
                if cur['name'] not in types[cur['category']]["names"]:
                    types[cur['category']]["names"].append(cur['name'])
                    sources[cur['source']]["names"].append(cur['name'])
                    
                types[cur['category']]["layers"].append(ct)
                sources[cur['source']]["layers"].append(ct)
                names[cur['name']]["layers"].append(ct)
                
                layers[ct] = {
                    "name": cur['name'],
                    "name2": cur['subname'],
                    "source": cur['source'],
                    "type": cur['category'],
                    "info": {},
                    "key_name": cur['key_name']
                    }
                    
                ct += 1
                
        while len(gbifnames) > 0:
            cur = gbifnames.pop(0)
            if 'points' not in types.keys():
                types['points'] = {"names": [],"sources": [], "layers": []}
            if 'GBIF' not in sources.keys():
                sources['GBIF'] = {"names": [],"types": [],"layers": []}
            if cur['name'] not in names.keys():
                names[cur['name']] = {"sources": [],"types": [],"layers": []}
            
            if cur['category'] not in names[cur['name']]["types"]:
                names[cur['name']]["types"].append(cur['category'])
                sources[cur['source']]["types"].append(cur['category'])
            if cur['source'] not in types[cur['category']]["sources"]:
                types[cur['category']]["sources"].append(cur['source'])
                names[cur['name']]["sources"].append(cur['source'])
            if cur['name'] not in types[cur['category']]["names"]:
                types[cur['category']]["names"].append(cur['name'])
                sources[cur['source']]["names"].append(cur['name'])
                
            types[cur['category']]["layers"].append(ct)
            sources[cur['source']]["layers"].append(ct)
            names[cur['name']]["layers"].append(ct)
            
            layers[ct] = {
                "name": cur['name'],
                "name2": cur['subname'],
                "source": cur['source'],
                "type": cur['category'],
                "info": {},
                "key_name": cur['key_name']
                }
                
            ct += 1
                
                
        out = {"query": query, "types": types, 
               "sources": sources, "layers": layers,
               "names": names}
        return out

class PointsHandler(BaseHandler):
    '''RequestHandler for GBIF occurrence point datasets
       Uses the GbifLayerProvider Service to return GBIF datasets
       
       Required query string parameters:
          sciname - string scientific name for point dataset
          
       Optional query string parameters:
          limit - integer number of records to return
          start - integer offset for paging of records
          source - string source of dataset, default and only gbif right now
    '''
    def __init__(self):
        super(PointsHandler, self).__init__()
        self.gbif = GbifLayerProvider()
        #self.ts = TileService()
        
    def post(self):
        src = self.request.params.get('source', 'gbif')
        lim = self.request.params.get('limit', 200)
        sta = self.request.params.get('start', 0)
        sn = self.request.params.get('sciname', "Puma concolor")
        query = {"limit": lim,
                 "start": 0,
                 "coordinatestatus": True,
                 "format": "darwin",
                 "sciname": sn,
                }
        url = self.gbif.geturl(query)
        data = self.gbif.getdata(query)
        self.response.headers['Content-Type'] = "application/json"
        self.response.out.write(simplejson.dumps(data)) # Not found

    def get(self):
        self.post()
            
class TileHandler(BaseHandler):
    '''Handles a PNG map tile request according to the Google XYZ tile
       addressing scheme described here:

       http://code.google.com/apis/maps/documentation/javascript/v2/overlays.html#Google_Maps_Coordinates

       Required query string parameters:
    '''
    
    def get(self):
        #range/mol/animalia/species/abditomys_latidens
        key_name = self.request.params.get('key_name', 'ecoregion/wwf/100') #or ecoregion, or protected area
        #datatype = self.request.params.get('type', 'range').lower() #or ecoregion, or protected area
        x = int(self.request.params.get('x', 0))
        y = int(self.request.params.get('y', 0))
        z = int(self.request.params.get('z', 0))
        r = self.request.params.get('r', None)
        g = self.request.params.get('g', None)
        b = self.request.params.get('b', None)
        tp = None
        
        d = key_name.split('/', 2)
        datatype, source, id = d[0],d[1],d[2]
        
        tp = TileService({
                'type': datatype.lower(),
                'source': source.lower(),
                'id': id,
                'z': z,
                'x': x,
                'y': y,
                'r': r,
                'g': g,
                'b': b })
        tp.gettile()
        if tp.status == 200:
            self.response.headers['Content-Type'] = "image/png"
            self.response.out.write(tp.png)
            return
        elif tp.status == 204:
            return self.response.set_status(204)
        else: 
            self.error(404)
            return self.response.set_status(404)
        """
        # Returns a 404 if there's no TileSetIndex for the species id since we
        # need it to calculate bounds and for the remote tile URL:
        metadata = TileSetIndex.get_by_key_name(species_key_name)
        if metadata is None:
            logging.error('No metadata for species: ' + species_key_name)
            self.error(404) # Not found
            return

        # Returns a 400 if the required query string parameters are invalid:
        try:
            zoom = self._param('z')
            x = self._param('x')
            y = self._param('y')
        except (BadArgumentError), e:
            logging.error('Bad request params: ' + str(e))
            self.error(400) # Bad request
            return

        # Returns a 404 if the request isn't within bounds of the species:
        within_bounds = True; # TODO: Calculate if within bounds.
        if not within_bounds:
            self.error(404) # Not found
            return

        # Builds the tile image URL which is also the memcache key. It's of the
        # form: http://mol.colorado.edu/tiles/species_id/zoom/x/y.png
        tileurl = metadata.remoteLocation
        tileurl = tileurl.replace('zoom', zoom)
        tileurl = tileurl.replace('/x/', '/%s/' % x)
        tileurl = tileurl.replace('y.png', '%s.png' % y)

        logging.info('Tile URL ' + tileurl)

        # Starts an async fetch of tile in case we get a memcache/datastore miss:
        # TODO: Optimization would be to async fetch the 8 surrounding tiles.
        rpc = urlfetch.create_rpc()
        urlfetch.make_fetch_call(rpc, tileurl)

        # Checks memcache for tile and returns it if found:
        memcache_key = "tileurl-%s" % tileurl
        
        r,g,b = None,None,None
        try:
            r = self._param('r')
            g = self._param('g')
            b = self._param('b')
            r,g,b = int(r),int(g),int(b)
            memcache_key = "tileurl-%s" % tileurl
            memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
            band = memcache.get(memk)
            if band is not None:
                logging.info('Tile memcache hit: ' + memk)
                self.response.headers['Content-Type'] = "image/png"
                self.response.out.write(band)
                return
        except:
            pass
            
        band = memcache.get(memcache_key)
        if band is not None:
            logging.info('Tile memcache hit: ' + memcache_key)
            self.response.headers['Content-Type'] = "image/png"
            if b is not None:
                memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                band = colorPng(band, r, g, b, isObj=True, memKey=memk)
            self.response.out.write(band)
            return

        # Checks datastore for tile and returns if found:
        tile_key_name = os.path.join(species_key_name, zoom, y, x)
        tile = Tile.get_by_key_name(tile_key_name)
        if tile is not None:
            logging.info('Tile datastore hit: ' + tile_key_name)
            memcache.set(memcache_key, tile.band, 60)
            self.response.headers['Content-Type'] = "image/png"
            if b is not None:
                memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                band = colorPng(tile.band, r, g, b, isObj=True, memKey=memk)
            self.response.out.write(tile.band)
            return

        # Gets downloaded tile from async rpc request and returns it or a 404:
        try:
            result = rpc.get_result() # This call blocks.
            if result.status_code == 200:
                logging.info('Tile downloaded: ' + tileurl)
                band = result.content
                memcache.set(memcache_key, band, 60)
                self.response.headers['Content-Type'] = "image/png"
                if b is not None:
                    memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                    band = colorPng(band, r, g, b, isObj=True, memKey=memk)
                self.response.out.write(band)
            else:
                logging.info('Status=%s, URL=%s' % (str(result.status_code), result.final_url))
                raise urlfetch.DownloadError('Bad tile result ' + str(result))
        except (urlfetch.DownloadError), e:
            logging.error('%s - %s' % (tileurl, str(e)))            
            self.error(404) # Not found
    """
    
class TaxonomyHandler(BaseHandler):
    '''RequestHandler for Taxonomy query
    
       Required query string parameters:
          
       Optional query string parameters:
          key - if given will do a direct key only search for the result
          names
          authorityName
          authorityIdentifier
          kingdom
          phylum
          class
          order
          superFamily
          family
          genus
          species
          infraSpecies
          hasRangeMap - boolean, if True will only return mapped results, no false filter yet
          simple - if given will return a simple result object, not full Species entry
    '''
    def __init__(self):
        super(TaxonomyHandler, self).__init__()
        self.taxonomy = TaxonomySearch()
        #self.ts = TileService()
    
    def get(self):
        if self.request.params.get('key', None) is not None:
            if self.request.params.get('simple', None) is not None:
                data = self.taxonomy.getdata({'key': self.request.params.get('key')})
            else:
                data = self.taxonomy.getdata({'key': self.request.params.get('key')})
            
            
        else: 
            query = {}
            params = ['limit',
                      'offset']
                      
            for p in params:
                if self.request.params.get(p, None) is not None:
                    query[p] = self.request.params.get(p) 
            
            filters = ['names', 'authorityName',
                       'authorityIdentifier', 'kingdom',
                       'phylum', 'class', 'order',
                       'superFamily', 'family', 'genus',
                       'species', 'infraSpecies', 'hasRangeMap']
            query['filters'] = {}
            for f in filters:
                if self.request.params.get(f, None) is not None:
                    query['filters'][f] = self.request.params.get(f) 
            if self.request.params.get('simple', None) is not None:
                data = self.taxonomy.getsimple(query)
            else:
                data = self.taxonomy.getdata(query)
                
        self.response.out.write(simplejson.dumps(data))
        
    """
        
    def methods(self):
        out = {"methods":{
            "search": "provide a name string to search for",
            "rank": "indicate the name rank to search in, default genus species",
            "key": "provide the known key for a taxon 'animalia/rank/binomial'",
            "callback": "crossdomain callback name",
            "limit": "number of records to return",
            "offset": "number of records to skip, for paging",
            }
           }
        return out

    def fromKey(self, k):
        results = []
        start = time.time()
        key = db.Key.from_path('Species', k.lower())
        ent = Species.get(key)
        ele = k.split("/")
        e = {
             "rank": str(ele[-2]),
             "name": str(ele[-1]).replace("_", " "),
             "classification": simplejson.loads(ent.classification),
             "authority": simplejson.loads(ent.authority),
             "names": simplejson.loads(ent.names) #.replace('\\','')
            }
        results.append(e)
        t = int(1000 * (time.time() - start)) / 1000.0
        out = {"time":t, "items":results}
        return out

    def fromQuery(self, r, s, of, n, maps=False):
        start = time.time()
        results = []
        orderOn = r if r is not None else "genus"
        memk = "%s/%s/%s/%s/%s" % (r, s, of, n, str(maps))
        d = memcache.get(memk)
        if d is None:
            logging.info('Memcache miss on ' + memk)
            if r is None:
                q = SpeciesIndex.all(keys_only=True).filter("names =", s.lower()).order(orderOn)
            else:
                q = SpeciesIndex.all(keys_only=True).filter("%s =" % r, s.lower()).order(orderOn)
            if maps:
                q.filter('hasRangeMap =', maps)
            logging.info('query ' + str(q.__dict__))
            d = q.fetch(limit=n, offset=of)
        else:
            logging.info('Memcache hit on ' + memk)
        memcache.set(memk, d, 3000)
        ct = 0
        for key in d:
            ct += 1
            ent = db.get(key.parent())
            p = key.id_or_name().split('/')
            e = {"key_name" : key.name(),
                 "rank": str(p[-2]),
                 "name": str(p[-1]).replace("_", " "),
                 "classification": simplejson.loads(ent.classification),
                 "authority": ent.authority,
                 "names": simplejson.loads(ent.names) #.('\\','')
                }
            results.append(e)
        t = int(1000 * (time.time() - start)) / 1000.0
        out = {"time":t, "items":results, "offset":of, "limit":n}
        return out

    def get(self):
        self.post()

    def handle_data_source_request(self, returnJson=True):
        #tq = self.request.get('tq')
        #params = simplejson.loads(tq)
        #logging.info(str(params))
        limit = int(self.request.get('limit'))
        offset = int(self.request.get('offset'))
        gql = self.request.get('q').strip()
        rank = self.request.get('rank', None)
        key = self.request.get('key', None)
        maps = self.request.get('maps', False)
        if maps == 'false':
            maps = False
        if maps == 'true':
            maps = True
        else:
            maps = None
        logging.info('maps ' + str(maps))

        # Gets the data for the request:
        if key:
            out = self.fromKey(key)
        elif gql is not None:
            out = self.fromQuery(rank, gql, offset, limit, maps=maps)
            logging.info('GQL ' + gql)
        data = out.get('items')

        # TODO: how to handle 'classification' and 'names' in table format?
        # Right now just flattening classification and ignoring names...
        rows = []
        for rec in data:
            row = {"Accepted Name":rec["name"].capitalize(), "Author":rec["classification"]["author"]}
            taxonomy = "%s/%s/%s/%s/%s" % (rec["classification"]["kingdom"].capitalize(),
                                           rec["classification"]["phylum"].capitalize(),
                                           rec["classification"]["class"].capitalize(),
                                           rec["classification"]["order"].capitalize(),
                                           rec["classification"]["family"].capitalize())
            row["Kingdom/Phylum/Class/Order/Family"] = taxonomy

            names_csv = ""
            for name in rec["names"]:
                names_csv += name["name"].capitalize() + ","
            row["Synonyms CSV"] = names_csv[:-1]


            key_name = rec["key_name"]
            if TileSetIndex.get_by_key_name(key_name) is not None:
                row["Range Map"] = "<a href='/map/%s'>map</a>" % key_name
            else:
                row["Range Map"] = ""


            rows.append(row)

        # Builds DataTable for Google Visualization API:
        description = {"Accepted Name": ("string", "accepted name"),
                       "Author": ("string", "author"),
                       "Kingdom/Phylum/Class/Order/Family": ("string", "Kingdom/Pyhlum/Class/Family"),
                       "Synonyms CSV": ("string", "synonyms csv"),
                       "Range Map": ("string", "range map")}

        if len(rows) > 0:
            spec = rows[0]
            logging.info(type(spec))
            for key in spec.keys():
                description[key] = ("string", key)
            data_table = gviz_api.DataTable(description)
            data_table.LoadData(rows)
        else:
            data_table = gviz_api.DataTable({"GUID":("string", "")})

        # Sends the DataTable response:
        if returnJson:
            json = data_table.ToJSon()
            logging.info(json)
            self.response.out.write(json)
            return
        tqx = self.request.get("tqx")
        self.response.out.write(data_table.ToResponse(tqx=tqx))

    def simpleview(self, out):
        data = out.get("items")
        rows = []
        for rec in data:
            row = {"Name":rec["name"].capitalize(), "Author":rec["classification"]["author"]}
            taxonomy = "%s/%s/%s/%s/%s" % (rec["classification"]["kingdom"].capitalize(),
                                           rec["classification"]["phylum"].capitalize(),
                                           rec["classification"]["class"].capitalize(),
                                           rec["classification"]["order"].capitalize(),
                                           rec["classification"]["family"].capitalize())
            row["Taxonomy"] = taxonomy
            names_csv = ""
            for name in rec["names"]:
                names_csv += name["name"].capitalize() + ","
            row["Synonyms"] = names_csv[:-1]
            key_name = rec["key_name"]
            if TileSetIndex.get_by_key_name(key_name) is not None:
                row["Map"] = "<a href='/rangemap/%s'>map</a>" % key_name
            else:
                row["Map"] = ""
            rows.append(row)
        return rows

    def post(self):
        # Checks for and handles a Google Visualization data source request:
        tqx = self.request.get('tqx', None)
        if tqx is not None:
            logging.info(tqx)
            self.handle_data_source_request(returnJson=True)
            return

        # Handle a normal API request:
        cb = self.request.params.get('callback', None)
        if cb is not None:
            self.response.out.write("%s(" % cb)
        k = self.request.params.get('key', None)
        s = self.request.params.get('q', None)
        r = self.request.params.get('rank', None)
        n = int(self.request.params.get('limit', 10))
        of = int(self.request.params.get('offset', 0))

        self.response.headers['Content-Type'] = 'application/json'
        if k:
            out = self.fromKey(k)
        elif s is not None:
            out = self.fromQuery(r, s, of, n)
        else:
            out = self.methods()

        #self.response.out.write(simplejson.dumps(out, indent=4))
        data = self.simpleview(out)
        data = {"items":data}
        json = simplejson.dumps(data)
        json_clean = json.replace('\n', '')
        #json = json.replace("\\/", "/")
        self.response.out.write(json_clean);
        if cb is not None:
            self.response.out.write(")")
    """

class MetadataHandler(webapp.RequestHandler):
    def _getprops(self, obj):
        '''Returns a dictionary of entity properties as strings.'''
        dict = {}
        for key in obj.properties().keys():
            if key in ['extentNorthWest', 'extentSouthEast', 'status', 'zoom', 'dateLastModified', 'proj', 'type']:
                dict[key] = str(obj.properties()[key].__get__(obj, TileSetIndex))
            """
            elif key in []:
                c = str(obj.properties()[key].__get__(obj, TileSetIndex))
                d = c.split(',')
                dict[key] = {"latitude":float(c[1]),"longitude":float(c[0])}
            """
        dict['mol_species_id'] = str(obj.key().name())
        return dict

    def get(self, class_, rank, species_id=None):
        self.post(class_, rank, species_id=None)

    def post(self, class_, rank, species_id=None):
        '''Gets a TileSetIndex identified by a MOL specimen id
        (/api/tile/metadata/specimen_id) or all TileSetIndex entities (/layers).
        '''
        if species_id is None or len(species_id) is 0:
            # Sends all metadata:
            self.response.headers['Content-Type'] = 'application/json'
            all = [self._getprops(x) for x in TileSetIndex.all()]
            # TODO: This response will get huge so we need a strategy here.
            self.response.out.write(simplejson.dumps(all))
            return

        species_key_name = os.path.join(class_, rank, species_id)
        metadata = TileSetIndex.get_by_key_name(species_key_name)
        if metadata:
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(simplejson.dumps(self._getprops(metadata)).replace("\\/", "/"))
        else:
            logging.error('No TileSetIndex for ' + species_key_name)
            self.error(404) # Not found

class LayersHandler(BaseHandler):
    '''BaseHandler utility for backend to send information about updated 
       tilesets.
       
       Required query string parameters:
          
       Optional query string parameters:
    '''

    AUTHORIZED_IPS = ['128.138.167.165', '127.0.0.1', '71.202.235.132']

    def _update(self, metadata):

        errors = self._param('errors', required=False)
        if errors is not None:
            metadata.errors.append(errors)
            db.put(metadata)
            logging.info('Updated TileSetIndex with errors only: ' + errors)
            return

        enw = db.GeoPt(self._param('maxLat', type=float), self._param('minLon', type=float))
        ese = db.GeoPt(self._param('minLat', type=float), self._param('maxLon', type=float))
        metadata.extentNorthWest = enw
        metadata.extentSouthEast = ese
        metadata.dateLastModified = datetime.datetime.now()
        metadata.remoteLocation = db.Link(self._param('remoteLocation'))
        metadata.zoom = self._param('zoom', type=int)
        metadata.proj = self._param('proj')
        metadata.errors = []
        metadata.status = db.Category(self._param('status', required=False))
        metadata.type = db.Category(self._param('type', required=False))
        db.put(metadata)
        location = wsgiref.util.request_uri(self.request.environ).split('?')[0]
        self.response.headers['Location'] = location
        self.response.headers['Content-Location'] = location
        self.response.set_status(204) # No Content

    def _create(self, species_key_name):
        errors = self._param('errors', required=False)
        if errors is not None:
            db.put(TileSetIndex(key=db.Key.from_path('TileSetIndex', species_key_name),
                                errors=[errors]))
            logging.info('Created TileSetIndex with errors only')
            return

        species = Species.get_by_key_name(species_key_name)
        species_index = SpeciesIndex.get_by_key_name(species_key_name, parent=species)
        if species_index is not None:
            logging.info('Updating SpeciesIndex.hasRangeMap for %s' % species_key_name)
            species_index.hasRangeMap = True
            db.put(species_index)

        enw = db.GeoPt(self._param('maxLat', type=float), self._param('minLon', type=float))
        ese = db.GeoPt(self._param('minLat', type=float), self._param('maxLon', type=float))
        db.put(TileSetIndex(key=db.Key.from_path('TileSetIndex', species_key_name),
                            dateLastModified=datetime.datetime.now(),
                            remoteLocation=db.Link(self._param('remoteLocation')),
                            zoom=self._param('zoom', type=int),
                            proj=self._param('proj'),
                            extentNorthWest=enw,
                            extentSouthEast=ese,
                            status=db.Category(self._param('status', required=False)),
                            type=db.Category(self._param('type', required=False))))
        location = wsgiref.util.request_uri(self.request.environ)
        self.response.headers['Location'] = location
        self.response.headers['Content-Location'] = location
        self.response.set_status(201) # Created

    def _getprops(self, obj):
        '''Returns a dictionary of entity properties as strings.'''
        dict = {}
        for key in obj.properties().keys():
            dict[key] = str(obj.properties()[key].__get__(obj, TileSetIndex))
        dict['mol_species_id'] = str(obj.key().name())
        return dict

    def get(self, class_, rank, species_id=None):
        '''Gets a TileSetIndex identified by a MOL specimen id
        (/layers/specimen_id) or all TileSetIndex entities (/layers).
        '''
        if species_id is None or len(species_id) is 0:
            # Sends all metadata:
            self.response.headers['Content-Type'] = 'application/json'
            all = [self._getprops(x) for x in TileSetIndex.all()]
            # TODO: This response will get huge so we need a strategy here.
            self.response.out.write(simplejson.dumps(all))
            return

        species_key_name = os.path.join(class_, rank, species_id)
        metadata = TileSetIndex.get_by_key_name(species_key_name)
        if metadata:
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(simplejson.dumps(self._getprops(metadata)))
        else:
            logging.error('No TileSetIndex for ' + species_key_name)
            self.error(404) # Not found

    def put(self, class_, rank, species_id):
        '''Creates a TileSetIndex entity or updates an existing one if the
        incoming data is newer than what is stored in GAE.'''

        remote_addr = os.environ['REMOTE_ADDR']
        if not remote_addr in LayersHandler.AUTHORIZED_IPS:
            logging.warning('Unauthorized PUT request from %s' % remote_addr)
            self.error(401) # Not authorized
            return
        try:
            species_key_name = os.path.join(class_, rank, species_id)
            metadata = TileSetIndex.get_by_key_name(species_key_name)
            if metadata:
                self._update(metadata)
            else:
                self._create(species_key_name)
        except (BadArgumentError), e:
            logging.error('Bad PUT request %s: %s' % (species_key_name, e))
            self.error(400) # Bad request

class KeyHandler(webapp.RequestHandler):
    '''RequestHandler utility for backend to check if a layer is a valid
       layer to be tiling or analyzing. Used for dropping new layers into
       the pipeling.
       
       Required query string parameters:
          
       Optional query string parameters:
    '''
    def get(self, class_, rank, species_id=None):
        species_key_name = os.path.join(class_, rank, species_id)
        q = Species.get_by_key_name(species_key_name)
        if q:
            self.response.set_status(200)
        else:
            self.error(404)
            
class TileSetMetadata(webapp.RequestHandler):
    def _getprops(self, obj):
        '''Returns a dictionary of entity properties as strings.'''
        dict = {}
        for key in obj.properties().keys():
            if key in ['extentNorthWest', 'extentSouthEast', 'status', 'zoom', 'dateLastModified', 'proj', 'type']:
                dict[key] = str(obj.properties()[key].__get__(obj, TileSetIndex))
            """
            elif key in []:
                c = str(obj.properties()[key].__get__(obj, TileSetIndex))
                d = c.split(',')
                dict[key] = {"latitude":float(c[1]),"longitude":float(c[0])}
            """
        dict['mol_species_id'] = str(obj.key().name())
        return dict

    def get(self, class_, rank, sepecies_id=None):
        self.post(class_, rank, species_id)

    def post(self, class_, rank, species_id=None):
        '''Gets a TileSetIndex identified by a MOL specimen id
        (/api/tile/metadata/specimen_id) or all TileSetIndex entities (/layers).
        '''
        if species_id is None or len(species_id) is 0:
            # Sends all metadata:
            self.response.headers['Content-Type'] = 'application/json'
            all = [self._getprops(x) for x in TileSetIndex.all()]
            # TODO: This response will get huge so we need a strategy here.
            self.response.out.write(simplejson.dumps(all))
            return

        species_key_name = os.path.join(class_, rank, species_id)
        metadata = TileSetIndex.get_by_key_name(species_key_name)
        if metadata:
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(simplejson.dumps(self._getprops(metadata)).replace("\\/", "/"))
        else:
            logging.error('No TileSetIndex for ' + species_key_name)
            self.error(404) # Not found

class TilePngHandler(webapp.RequestHandler):
    """RequestHandler for map tile PNGs."""
    def __init__(self):
        super(TilePngHandler, self).__init__()
        self.ts = TileService()
    def get(self):
        #convert the URL route into the key (removing .png)
        url = self.request.path_info
        assert '/' == url[0]
        path = url[1:]
        (b1, b2, tileurl) = path.split("/", 2)
        tileurl = tileurl.split('.')[0]

        fullTest = False
        band = memcache.get("tile-%s" % tileurl)
        if band is None:
            tile = self.ts.tile_from_url(tileurl)
            if tile:
                band = tile.band

        if band is not None:
            memcache.set("tile-%s" % tileurl, band, 60)
            try:
                tmp = str(band)
            except:
                tmp = 0

            if cmp(tmp, 'f') == 0:
                self.redirect("/static/full.png")
            else:
                self.response.headers['Content-Type'] = "image/png"
                self.response.out.write(self.t.band)

class FindID(webapp.RequestHandler):
    def get(self, a, id):
        q = SpeciesIndex.all(keys_only=True).filter("authorityName =", a).filter("authorityIdentifier =", id)
        d = q.fetch(limit=2)
        if len(d) == 2:
            return "multiple matches"
        elif len(d) == 0:
            self.error(404)
        else:
            k = d[0]
            self.response.out.write(str(k.name()))

class RangeMapHandler(BaseHandler):
    '''Handler for rendering range maps based on species key_name.'''
    def get(self):
        self.push_html('range_maps.html')
   
class ColorImage(BaseHandler):
    """Handler for the search UI."""
    def get(self,name):
        
        r = int(self.request.get('r', 0))
        g = int(self.request.get('g', 0))
        b = int(self.request.get('b', 0))
        memk = "%s/%s/%s/%s" % (name, r, g, b)
        val = memcache.get(memk)
        if val is None:
            val = colorPng(name, r, g, b, isObj=False)
        memcache.set(memk, val, 60)
        
        # binary PNG data
        self.response.headers["Content-Type"] = "image/png"
        self.response.out.write(val)
        
"""
class EcoregionMetadata(webapp.RequestHandler):
    '''Method should be called as a first stop to any layer being loaded
       When executed, it also starts tiling zoom zero tiles for the layer
    '''
    def _getprops(self, obj):
        '''Returns a dictionary of entity properties as strings.'''
        dict = {}
        for key in obj.properties().keys():
            if key in ['extentNorthWest', 'extentSouthEast', 'dateCreated', 
                        'remoteLocation', 'ecoName', 'realm', 'biome', 'ecoNum', 
                        'ecoId', 'g200Region', 'g200Num', 'g200Biome', 'g200Stat']:
                dict[key] = str(obj.properties()[key].__get__(obj, Ecoregion))
        dict['ecoCode'] = str(obj.key().name())
        return dict

    def get(self, region_id=None):
        self.post(region_id)

    def post(self, region_id=None):
        metadata = Ecoregion.get_by_key_name(region_id)
        minx, maxy = obj.properties['extentNorthWest']
        maxx, miny = obj.properties['extentSouthEast']
        bboxurl = "http://mol.colorado.edu/layers/api/ecoregion/tilearea/" + \
                  "{code}?record_ids={code}&zoom={z}&lowx={minx}&lowy={miny}&highx={maxx}&highy={maxy}"
        bboxurl = bboxurl.replace("{code}",region_id)
        bboxurl = bboxurl.replace("{z}",0)
        bboxurl = bboxurl.replace("{minx}",minx)
        bboxurl = bboxurl.replace("{maxx}",maxx)
        bboxurl = bboxurl.replace("{miny}",miny)
        bboxurl = bboxurl.replace("{maxy}",maxy)
        rpc = urlfetch.create_rpc()
        urlfetch.make_fetch_call(rpc, bboxurl)
        if metadata:
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write(simplejson.dumps(self._getprops(metadata)).replace("\\/", "/"))
        else:
            logging.error('No TileSetIndex for ' + record_id)
            self.error(404) # Not found
            
        result = rpc.get_result() #TODO: Aaron is this really necessary here?
"""

class EcoregionTileHandler(BaseHandler):
    def get(self, name):
        '''Handles a PNG map tile request according to the Google XYZ tile
        addressing scheme described here:
        
        Required query string parameters:
            z - integer zoom level
            y - integer latitude pixel coordinate
            x - integer longitude pixel coordinate
        '''
        name, ext = os.path.splitext(name)
        logging.info('Ecoregion collection name ' + name)
        # Returns a 404 if there's no TileSetIndex for the species id since we
        # need it to calculate bounds and for the remote tile URL:
        # TODO: create region metadata datastore
        #metadata = TileSetIndex.get_by_key_name(species_key_name)
        metadata = True
        # Returns a 404 if the requested region_id doesn't exist:
        if metadata is None:
            self.error(404) # Not found
            return
            
        # Returns a 400 if the required query string parameters are invalid:
        try:
            zoom = self._param('z')
            x = self._param('x')
            y = self._param('y')
        except (BadArgumentError), e:
            logging.error('Bad request params: ' + str(e))
            self.error(400) # Bad request
            return

        # Returns a 404 if the request isn't within bounds of the region:
        within_bounds = True; # TODO: Calculate if within bounds.
        if not within_bounds:
            self.error(404) # Not found
            return

        # Builds the tile image URL which is also the memcache key. It's of the
        # form: http://mol.colorado.edu/tiles/species_id/zoom/x/y.png
        #tileurl = metadata.remoteLocation
        tileurl ="http://mol.colorado.edu/layers/api/ecoregion/tile/{code}?zoom={z}&x={x}&y={y}"
        
        tileurl = tileurl.replace('{z}', zoom)
        tileurl = tileurl.replace('{x}', x)
        tileurl = tileurl.replace('{y}', y)
        tileurl = tileurl.replace('{code}', name)
        
        logging.info('Tile URL ' + tileurl)
        
        # Starts an async fetch of tile in case we get a memcache/datastore miss:
        # TODO: Optimization would be to async fetch the 8 surrounding tiles.
        rpc = urlfetch.create_rpc()
        urlfetch.make_fetch_call(rpc, tileurl)

        # Checks memcache for tile and returns it if found:
        memcache_key = "tileurl-%s" % tileurl
        
        r,g,b = None,None,None
        try:
            r = self._param('r')
            g = self._param('g')
            b = self._param('b')
            r,g,b = int(r),int(g),int(b)
            memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
            band = memcache.get(memk)
            band = None
            if band is not None:
                logging.info('Tile memcache hit: ' + memk)
                self.response.headers['Content-Type'] = "image/png"
                self.response.out.write(band)
                return
        except:
            pass
        
        band = memcache.get(memcache_key)
        if band is not None:
            logging.info('Tile memcache hit: ' + memcache_key)
            self.response.headers['Content-Type'] = "image/png"
            if b is not None:
                logging.info('colored')
                memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                band = colorPng(band, r, g, b, isObj=True, memKey=memk)
            self.response.out.write(band)
            return
        
        # Checks datastore for tile and returns if found:
        """
        tile_key_name = os.path.join(species_key_name, zoom, y, x)
        tile = Tile.get_by_key_name(tile_key_name)
        if tile is not None:
            logging.info('Tile datastore hit: ' + tile_key_name)
            memcache.set(memcache_key, tile.band, 60)
            self.response.headers['Content-Type'] = "image/png"
            if b is not None:
                memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                band = colorPng(tile.band, r, g, b, isObj=True, memKey=memk)
            self.response.out.write(tile.band)
            return
        """
        # Gets downloaded tile from async rpc request and returns it or a 404:
        try:
            result = rpc.get_result() # This call blocks.
            if result.status_code == 200:
                logging.info('Tile downloaded: ' + tileurl)
                band = result.content
                memcache.set(memcache_key, band, 60)
                self.response.headers['Content-Type'] = "image/png"
                if b is not None:
                    memk = "%s/%s/%s/%s" % (memcache_key, r, g, b)
                    band = colorPng(band, r, g, b, isObj=True, memKey=memk)
                self.response.out.write(band)
            else:
                logging.info('Status=%s, URL=%s' % (str(result.status_code), result.final_url))
                raise urlfetch.DownloadError('Bad tile result ' + str(result))
        except (urlfetch.DownloadError), e:
            logging.error('%s - %s' % (tileurl, str(e)))            
            self.error(404) # Not found

class EcoregionLayerSearch(BaseHandler):
    def get(self):
        self.post()
    def post(self):
        ecoCode = self._param('ecocode').strip()
        #er = Ecoregion.get_by_key_name(ecoCode)
        er = Ecoregion.get_or_insert(ecoCode)
        if True:
            nw = simplejson.loads(self._param('nw').replace("'",'"'))
            se = simplejson.loads(self._param('se').replace("'",'"'))
            
            url = "http://mol.colorado.edu/layers/api/ecoregion/tilearea/%s?zoom=0&lowx=%s&lowy=%s&highx=%s&highy=%s" % (ecoCode,nw['lon'],se['lat'],se['lon'],nw['lat'])
            logging.error(url)
            rpc = urlfetch.create_rpc()
            urlfetch.make_fetch_call(rpc, url)
            
            cl = simplejson.loads(self._param('clickables').replace("'",'"'))
            er.extentNorthWest = db.GeoPt(lat=nw['lat'],lon=nw['lon'])
            er.extentSouthEast = db.GeoPt(lat=se['lat'],lon=se['lon'])
            er.polyStrings = []
            ss = []
            ns = str(er.ecoName).split(' ')
            last = ""
            full = ""
            first = True
            for n in ns:
                n = n.lower()
                ss.append(n)
                subs = re.findall('\w+', n)
                if len(subs) > 1:
                    for s in subs:
                        ss.append(s)
                full = ' '.join([full, n])
                if first:
                    first = False
                else:
                    ss.append(last + ' ' + n)
                    ss.append(full)
                last = n
            
            for c in cl:
                poly = {"type": "bbox", 
                        "value": {
                            "nw": {"lat": c['nw']['lat'],"lon": c['nw']['lon']}, 
                            "se": {"lat": c['se']['lat'],"lon": c['se']['lon']}
                            }
                        }
                er.polyStrings.append(simplejson.dumps(poly))
            erL = EcoregionLayer.get_or_insert(ecoCode)
            erL.name=er.ecoName
            erL.id=ecoCode
            erL.ecoCodes = [ecoCode]
            erL.searchStrings = ss
            
            er.put()
            erL.put()
            
            result = rpc.get_result() # This call blocks.
            logging.error(result.status_code)
        else:
            logging.error(ecoCode)

application = webapp.WSGIApplication(
         [('/webapp', WebAppHandler),
         
          ('/data/points', PointsHandler), 
          ('/data/tile', TileHandler),

          ('/search/taxonomy', TaxonomyHandler),
          ('/search/metadata', MetadataHandler),
          
          ('/util/layers', LayersHandler), 
          ('/util/validkey', KeyHandler),

          ('/test/colorimage/([^/]+)', ColorImage),
          ('/test/findid/([^/]+)/([^/]+)', FindID),
          ('/test/tile/[\d]+/[\d]+/[\w]+.png', TilePngHandler),
          ('/test/ecoregion/tile/([\w]*.png)', EcoregionTileHandler),
          ('/test/ecoregion/search', EcoregionLayerSearch),
          #('/test/gbif', GBIFTest),
          #('/test/ecoregion/metadata/([\w]+)', EcoregionMetadata),
          ],
         debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
