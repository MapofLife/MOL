__author__ = "Aaron Steele (eightysteele@gmail.com)"
__contributors__ = []

from autocomplete_handler import AutocompleteName
import cache

import collections
import csv
import logging
import json
import urllib
import webapp2

from google.appengine.api import urlfetch
from google.appengine.ext import ndb
from google.appengine.ext.ndb import model
from google.appengine.ext.webapp.util import run_wsgi_app

global entities
entities = []

global ac_entities
ac_entities = []

global names_map

def check_entities(flush=False):
    """Writes entities to datastore in batches."""
    global entities
    global ac_entities
    if len(entities) >= 500 or flush:
        ndb.put_multi(entities)
        entities = []
    if len(ac_entities) >= 500 or flush:
        ndb.put_multi(ac_entities)
        ac_entities = []

def handle_result(rpc, name, url, payload):
    """Builds up a list of CacheEntry entities and batch puts them."""
    key = 'name-%s' % name
    try:
        result = rpc.get_result()
        entities.append(cache.create_entry(key, result.content))
        entities.extend([cache.create_entry('name-%s' % x, result.content)
                         for x in names_map[name]])
        check_entities()
    except urlfetch.DownloadError:
        tries = 10
        while tries > 0:
            try:
                result = urlfetch.fetch(url, payload=payload, method='POST', deadline=60)
                entities.append(cache.create_entry(key, result.content))
                entities.extend([cache.create_entry('name-%s' % x, result.content)
                                 for x in names_map[name]])
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

def load_names():
    """Loads names.csv into a defaultdict with scientificname keys mapped to
    a list of common names."""
    global names_map
    names_map = collections.defaultdict(list)
    for row in csv.DictReader(open('names.csv', 'r')):
        names_map[row['scientific'].strip()].extend([x.strip() for x in row['english'].split(',')])

def add_autocomplete_cache(name, kind):
    """Add autocomplete cache entries.

    Arguments:
      name - The name (Puma concolor)
      kind - The name kind (scientific, english, etc)
    """
    name = name.strip()
    kind = kind.strip()
    name_val = '%s:%s' % (name, kind)
    for term in name_keys(name):
        key = 'ac-%s' % term
        names = cache.get(key, loads=True) # names is a list of names
        if names:
            if name_val not in names:
                names.append(name_val)
        else:
            names = [name_val]
        entity = cache.create_entry(key, names, dumps=True)
        ac_entities.append(entity)
    check_entities(flush=True)

def add_autocomplete_results(name):
    # Add name search results.
    name = name.strip()
    for term in name_keys(name):
        key = 'ac-%s' % term
        names_list = cache.get(key, loads=True) # names is a list of names

        # Note: Each 'x' here is of the form name:kind which is why we split on ':'
        rows = [cache.get('name-%s' % x.split(':')[0], loads=True)['rows'] for x in names_list]

        result = reduce(lambda x, y: x + y, rows)
        entity = cache.get('name-%s' % term, loads=True)
        if not entity:
            entity = cache.create_entry(
                'name-%s' % term, dict(rows=result), dumps=True)
        if entity.has_key('rows'):
            for r in entity['rows']:
                if r not in result:
                    result.append(r)
            entity = cache.create_entry(
                'name-%s' % term, dict(rows=result), dumps=True)
        else:
            logging.warn('No rows for entity %s' % entity)
        entities.append(entity)
    check_entities(flush=True)

class ClearCache(webapp2.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        keys = []
        key_count = 0
        for key in cache.CacheItem.query().iter(keys_only=True):            
            if key_count > 100:
                try:
                    ndb.delete_multi(keys)
                    keys = []
                    key_count = 0
                except:
                    logging.info('delete_multi retry')
                    tries = 10
                    while tries > 0:
                        try:
                            ndb.delete_multi(keys)
                            keys = []
                            key_count = 0
                        except:
                            logging.info('delete_multi retries left: %s' % tries)
                            tries = tries - 1
                    log.info('Failed to delete_multi on %s' % keys)
            keys.append(key)
        if len(keys) > 0:
            ndb.delete_multi(keys)


class SearchCacheBuilder(webapp2.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        url = 'https://mol.cartodb.com/api/v2/sql'
        sql = "select distinct(scientificname) from scientificnames where type = 'protectedarea'"

        rows = []

        # Get polygons names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql)))
        try:
            result = urlfetch.fetch(request, deadline=60)
        except urlfetch.DownloadError:
            tries = 10
            while tries > 0:
                try:
                    result = urlfetch.fetch(request, deadline=60)
                except urlfetch.DownloadError:
                    tries = tries - 1
        content = result.content
        rows.extend(json.loads(content)['rows'])

        load_names()

        # Get unique names from points and polygons:
        unique_names = list(set([x['scientificname'] for x in rows]))


        #sql = "SELECT p.provider as source, p.scientificname as name, p.type as type FROM polygons as p WHERE p.scientificname = '%s' UNION SELECT t.provider as source, t.scientificname as name, t.type as type FROM points as t WHERE t.scientificname = '%s'"

        sql = "SELECT sn.provider AS source, sn.scientificname AS name, sn.type AS type FROM scientificnames AS sn WHERE sn.scientificname = '%s'"

        # Cache search results.
        rpcs = []
        for names in self.names_generator(unique_names):
            for name in names:
                q = sql % name 
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
            add_autocomplete_cache(name, 'scientific')
            if names_map.has_key(name):
                for common in names_map[name]:
                    add_autocomplete_cache(common, 'english')
        check_entities(flush=True)

        # # Build autocomplete search results cache:
        for name in unique_names:
            add_autocomplete_results(name)
            if names_map.has_key(name):
                for common in names_map[name]:
                    add_autocomplete_results(common)
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

class AutoCompleteBuilder(webapp2.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        url = 'https://mol.cartodb.com/api/v2/sql'
        sql_points = "select distinct(scientificname) from points limit 800"
        sql_polygons = "select distinct(scientificname) from polygons limit 800"

        # Get points names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_points)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows = json.loads(content)['rows']

        # Get polygons names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_polygons)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows.extend(json.loads(content)['rows'])

        load_names()

        # Get unique names from points and polygons:
        unique_names = list(set([x['scientificname'] for x in rows]))


        sql = "SELECT p.provider as source, p.scientificname as name, p.type as type FROM polygons as p WHERE p.scientificname = '%s' UNION SELECT t.provider as source, t.scientificname as name, t.type as type FROM points as t WHERE t.scientificname = '%s'"

        # Cache search results.
        # rpcs = []
        # for names in self.names_generator(unique_names):
        #     for name in names:
        #         q = sql % (name, name)
        #         payload = urllib.urlencode(dict(q=q))
        #         rpc = urlfetch.create_rpc(deadline=60)
        #         rpc.callback = create_callback(rpc, name, url, payload)
        #         urlfetch.make_fetch_call(rpc, url, payload=payload, method='POST')
        #         rpcs.append(rpc)
        #     for rpc in rpcs:
        #         rpc.wait()

        # check_entities(flush=True)

        # Build autocomplete cache:
        for name in unique_names:
            add_autocomplete_cache(name, 'scientific')
            if names_map.has_key(name):
                for common in names_map[name]:
                    add_autocomplete_cache(common, 'english')
        check_entities(flush=True)

        # Build autocomplete search results cache:
        # for name in unique_names:
        #     add_autocomplete_results(name)
        #     if names_map.has_key(name):
        #         for common in names_map[name]:
        #             add_autocomplete_results(common)
        # check_entities(flush=True)

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

class SearchResponseBuilder(webapp2.RequestHandler):
    def get(self):
        self.error(405)
        self.response.headers['Allow'] = 'POST'
        return

    def post(self):
        url = 'https://mol.cartodb.com/api/v2/sql'
        sql_points = "select distinct(scientificname) from points limit 800"
        sql_polygons = "select distinct(scientificname) from polygons limit 800"

        # Get points names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_points)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows = json.loads(content)['rows']

        # Get polygons names:
        request = '%s?%s' % (url, urllib.urlencode(dict(q=sql_polygons)))
        result = urlfetch.fetch(request, deadline=60)
        content = result.content
        rows.extend(json.loads(content)['rows'])

        load_names()

        # Get unique names from points and polygons:
        unique_names = list(set([x['scientificname'] for x in rows]))


        sql = "SELECT p.provider as source, p.scientificname as name, p.type as type FROM polygons as p WHERE p.scientificname = '%s' UNION SELECT t.provider as source, t.scientificname as name, t.type as type FROM points as t WHERE t.scientificname = '%s'"

        # Cache search results.
        # rpcs = []
        # for names in self.names_generator(unique_names):
        #     for name in names:
        #         q = sql % (name, name)
        #         payload = urllib.urlencode(dict(q=q))
        #         rpc = urlfetch.create_rpc(deadline=60)
        #         rpc.callback = create_callback(rpc, name, url, payload)
        #         urlfetch.make_fetch_call(rpc, url, payload=payload, method='POST')
        #         rpcs.append(rpc)
        #     for rpc in rpcs:
        #         rpc.wait()

        # check_entities(flush=True)

        # Build autocomplete cache:
        # for name in unique_names:
        #     add_autocomplete_cache(name, 'scientific')
        #     if names_map.has_key(name):
        #         for common in names_map[name]:
        #             add_autocomplete_cache(common, 'english')
        # check_entities(flush=True)

        # Build autocomplete search results cache:
        for name in unique_names:
            add_autocomplete_results(name)
            if names_map.has_key(name):
                for common in names_map[name]:
                    add_autocomplete_results(common)
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

application = webapp2.WSGIApplication(
    [('/backend/build_search_cache', SearchCacheBuilder),
     ('/backend/clear_search_cache', ClearCache),
     ('/backend/build_autocomplete', AutoCompleteBuilder),
     ('/backend/build_search_response', SearchResponseBuilder),]
    , debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
