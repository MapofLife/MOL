"""This module contains request handlers for  admin-only access."""

import datetime
import logging
import webapp2

from google.appengine.api import backends
from google.appengine.api import taskqueue
#from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class SearchCacheHandler(webapp2.RequestHandler):
    def get(self):
        taskqueue.add(
            url='/backend/build_search_cache', 
            queue_name='build-search-cache', 
            eta=datetime.datetime.now(), 
            target='search-cache-builder-backend')            
        self.response.set_status(202) # Accepted

class ClearCacheHandler(webapp2.RequestHandler):
    def get(self):
        taskqueue.add(
            url='/backend/clear_search_cache', 
            queue_name='clear-search-cache', 
            eta=datetime.datetime.now(), 
            target='search-cache-builder-backend')            
        self.response.set_status(202) # Accepted

class AutoCompleteHandler(webapp2.RequestHandler):
    def get(self):
        taskqueue.add(
            url='/backend/build_autocomplete', 
            queue_name='build-autocomplete-cache', 
            eta=datetime.datetime.now(), 
            target='search-cache-builder-backend')            
        self.response.set_status(202) # Accepted

class SearchResponseHandler(webapp2.RequestHandler):
    def get(self):
        taskqueue.add(
            url='/backend/build_search_response', 
            queue_name='build-search-response-cache', 
            eta=datetime.datetime.now(), 
            target='search-cache-builder-backend')            
        self.response.set_status(202) # Accepted

application = webapp2.WSGIApplication(
         [('/admin/build-search-cache', SearchCacheHandler),
          ('/admin/clear-search-cache', ClearCacheHandler),
          ('/admin/build-autocomplete', AutoCompleteHandler),
          ('/admin/build-search-response', SearchResponseHandler)],
         debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
