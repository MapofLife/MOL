"""This module contains a handler for proxing the EOL images API."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import json
import logging
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

class EOLHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):
        """Returns a cached value by key or None if it doesn't exist."""
        names = self.request.get('names').split(',')
        results = {}
        for name in names:
            key = 'eol-images-%s' % name
            value = memcache.get(key)
            if value:
                logging.info('memcache value: %s' % value)
            else:
                value = cache.get(key, loads=True)
                if not value:
                    name = urllib.quote(name)
                    search_url = 'http://eol.org/api/search/%s.json?exact=1' % name
                    result = json.loads(urlfetch.fetch(search_url, deadline=60).content)
                    page_id = result['results'][0]['id']
                    page_url = 'http://eol.org/api/pages/1.0/%s.json' % page_id
                    logging.info(page_url)
                    result = json.loads(urlfetch.fetch(page_url, deadline=60).content)
                    object_id = None
                    for x in result['dataObjects']:
                        if x['dataType'].endswith('StillImage'):
                            object_id = x['identifier']
                    if object_id:
                        object_url = 'http://eol.org/api/data_objects/1.0/%s.json' % object_id
                        value = json.loads(urlfetch.fetch(object_url, deadline=60).content)
            cache.add(key, value, dumps=True)
            memcache.add(key, value) 
            results[name] = value        
        self.response.headers["Content-Type"] = "application/json"        
        self.response.out.write(json.dumps(results))
                    
application = webapp2.WSGIApplication(
    [('/eol/images', EOLHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
