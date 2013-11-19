"""This module contains a handler for proxying the GBIF Occurrences API."""

__author__ = 'Jeremy Malczyk'

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

class GBIFHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        self.post()

    def post(self):

        oid = self.request.get('oid')
        search_url = 'http://data.gbif.org/ws/rest/occurrence/get/%s' % oid
        result = urlfetch.fetch(search_url, deadline=60).content
        self.response.out.write(result)

application = webapp2.WSGIApplication(
    [('/gbif/occurrence', GBIFHandler,)],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
