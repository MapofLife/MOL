"""This module contains a cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache
import molcounter

# Standard Python imports
import json
import logging
import urllib
import webapp2

# Google App Engine imports
from google.appengine.ext.ndb import model
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext import ndb
from google.appengine.ext.webapp.util import run_wsgi_app

class CountHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        top = self.request.get_range('count', default=10)
        all_results = self.request.get('all', 0)
        value = json.dumps(molcounter.get_top_names(top, all_results))
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)

    def post(self):
        name = self.request.get('name', None)
        if name:
            molcounter.increment(name.replace('ac-sql-', ''))
   
class ResultsHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):
        """Returns a cached value by key or None if it doesn't exist."""
        names = self.request.get('names').split(',')
        keys = [model.Key('CacheItem', 'latin-%s' % name.strip().lower()) 
                for name in names if name]       
        values = ndb.get_multi(keys)
        results = dict([(value.key.id().replace('latin-%s', ''), json.loads(value._to_dict()['string'])) 
                        for value in values if value])
        self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(json.dumps(results))

application = webapp2.WSGIApplication(
    [('/cartodb/results', ResultsHandler),
     ('/cartodb/results/count', CountHandler),],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
