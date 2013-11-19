"""This module surfaces an autocomplete API for scientificname. 

Example usage:

  http://localhost:8080/api/autocomplete?key=Abr

  [
    "Abrawayaomys ruschii",
    "Abrocoma bennettii",
    "Abrocoma boliviensis",
    "Abrocoma cinerea",
    "Abrothrix andinus",
    "Abrothrix jelskii"
  ]
"""

import cache


from google.appengine.ext.ndb import model
from google.appengine.ext.webapp.util import run_wsgi_app

import logging
import json
import webapp2

class AutocompleteHandler(webapp2.RequestHandler):
    """Handler for the autocomplete request. Expects a key parameter. Returns 
    a list of all matching names or an empty list as JSON.
    """
    def get(self):
        self.response.headers["Content-Type"] = "application/json"
        key = self.request.get('key', None)
        if not key:
            self.response.out.write('[]')
            return
        names = cache.get(key)
        self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
        if not names:
            self.response.out.write('[]')
        else:
            self.response.out.write(names)

application = webapp2.WSGIApplication(
         [('/api/autocomplete', AutocompleteHandler)],
         debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
