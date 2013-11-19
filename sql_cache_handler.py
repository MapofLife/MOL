"""This module contains a cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import logging

# Google App Engine imports
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class GetHandler(webapp.RequestHandler):
    """Request handler for cache requests."""

    def post(self):

        key = self.request.get('key', None)
        value = cache.get(key)
        if not value:
            value = urlfetch.fetch(key).content
            cache.add(key, value)
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)
                    
application = webapp.WSGIApplication(
    [('/cache/get', GetHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
