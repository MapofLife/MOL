__author__ = "Aaron Steele (eightysteele@gmail.com)"
__contributors__ = []

from autocomplete_handler import AutocompleteName
import cache

import logging
import simplejson
import urllib

from google.appengine.api import urlfetch
from google.appengine.ext import ndb 
from google.appengine.ext import webapp
from google.appengine.ext.ndb import model
from google.appengine.ext.webapp.util import run_wsgi_app

global entities
entities = []

global ac_entities
ac_entities = []


def check_entities(flush=False):
    """Writes entities to datastore in batches."""
    global entities
    global ac_entities
    if len(entities) > 100 or flush:
        ndb.put_multi(entities)
        entities = [] 
    if len(ac_entities) > 100 or flush:
        ndb.put_multi(ac_entities)
        ac_entities = [] 
    
def handle_result(rpc, name, url, payload):
    """Builds up a list of CacheEntry entities and batch puts them."""   
    key = 'name-%s' % name
    try:
        result = rpc.get_result()
        entities.append(cache.create_entry(key, result.content))
        check_entities()
    except urlfetch.DownloadError:
        tries = 10
        while tries > 0:
            result = urlfetch.fetch(url, payload=payload, method='POST', deadline=60)
            try:
                entities.append(cache.create_entry(key, result.content))
                check_entities()
                return
            except urlfetch.DownloadError:
                tries = tries - 1

def create_callback(rpc, name, url, payload):
    """Callback for a request."""
    return lambda: handle_result(rpc, name, url, payload)

def name_keys(name):
    """Generates name keys that are at least 3 characters long.
    
    Example usage:
        > name_keys('concolor') 
        > ['con', 'conc', 'conco', 'concol', 'concolo', 'concolor']
    """
    yield name.strip()
    for n in name.split():
        name_len = len(n)
        yield n
        if name_len > 3:
            indexes = range(3, name_len)
            indexes.reverse()
            for i in indexes:
                yield n[:i]

def index_name(name):
    """Create AutocompleteName entities."""
    for key in name_keys(name):
        entity = AutocompleteName.get(key)
        if entity:
            if name not in entity.names:
                entity.names.append(name)
        else:
            entity = AutocompleteName.create(key)
            entity.names.append(name)
        ac_entities.append(entity)
    check_entities(flush=True)
    
class SearchCacheBuilder(webapp.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        url = 'https://mol.cartodb.com/api/v2/sql'
        sql_points = 'SET STATEMENT_TIMEOUT TO 0; select distinct(scientificname) from points' # limit 20' 
        sql_polygons = 'SET STATEMENT_TIMEOUT TO 0; select distinct(scientificname) from polygons' #limit 20' 

        # Get points names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_points)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows = simplejson.loads(content)['rows']

        # Get polygons names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_polygons)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows.extend(simplejson.loads(content)['rows'])

        # Get unique names from points and polygons:
        unique_names = list(set([x['scientificname'] for x in rows]))


        sql = "SET STATEMENT_TIMEOUT TO 0; SELECT p.provider as source, p.scientificname as name, p.type as type FROM polygons as p WHERE p.scientificname = '%s' UNION SELECT t.provider as source, t.scientificname as name, t.type as type FROM points as t WHERE t.scientificname = '%s'"          

        # Cache search results.
        rpcs = []
        for names in self.names_generator(unique_names):
            for name in names:

                #index_name(name)

                q = sql % (name, name)
                payload = urllib.urlencode(dict(q=q))
                rpc = urlfetch.create_rpc(deadline=60)
                rpc.callback = create_callback(rpc, name, url, payload)
                urlfetch.make_fetch_call(rpc, url, payload=payload, method='POST')
                rpcs.append(rpc)
            
            for rpc in rpcs:
                rpc.wait()
            
        check_entities(flush=True)

        # Build autocomplete cache:
        for name in unique_names:
            # Add autocomplete cache entries:
            for term in name_keys(name):
                key = 'ac-%s' % term
                names = cache.get(key, loads=True) # names is a list of names
                if names:
                    if name not in names:
                        names.append(name)
                else:
                    names = [name]
                entity = cache.create_entry(key, names, dumps=True)
                ac_entities.append(entity)
            check_entities()
        check_entities(flush=True)

        # Build autocomplete search results cache:
        for name in unique_names:
            for term in name_keys(name):
                key = 'ac-%s' % term
                names_list = cache.get(key, loads=True) # names is a list of names
                rows = [cache.get('name-%s' % x, loads=True)['rows'] 
                           for x in names_list]
                result = reduce(lambda x, y: x + y, rows)
                entity = cache.create_entry(
                    'name-%s' % term, dict(rows=result), dumps=True)
                entities.append(entity)
            check_entities()
        check_entities(flush=True)
            

    def names_generator(self, unique_names):
        """Generates lists of at most 10 names."""
        names = []
        for x in xrange(len(unique_names)):
            names.append(unique_names[x])
            if x % 10 == 0:
                yield names
                names = []
        if len(names) > 0:
            yield names            
    
application = webapp.WSGIApplication(
    [('/backend/build_search_cache', SearchCacheBuilder),]
    , debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
