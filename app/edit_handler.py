"""This module contains a handler that pushes geometries to a userdata table."""

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
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

api_key = ''

class PutHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""
    def post(self):

        sciname = self.request.get('scientificname')
        userid = self.request.get('userid')
        seasonality = self.request.get('seasonality')
        description = self.request.get('description')
        dataset_id = self.request.get('dataset_id')
        geojson = self.request.get('geojson')

        sql = "INSERT INTO userdata \
    (userid, scientificname, seasonality, description, dataset_id, the_geom) \
    VALUES( \
        '%s', \
        '%s', \
        '%s', \
        '%s', \
        '%s', \
        ST_SetSRID(ST_GeomFromGeoJSON('%s'),4326) \
        )" % (userid, sciname, seasonality, description, dataset_id, geojson)

        url = 'http://mol.cartodb.com/api/v2/sql?%s' % (urllib.urlencode(dict(q=sql, api_key=api_key)))
        logging.info(url)
        value = urlfetch.fetch(url, deadline=60).content

        self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)

class DelHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""
    def post(self):

        dataset_id = self.request.get('dataset_id')

        sql = "DELETE FROM userdata WHERE dataset_id = '%s'" % (dataset_id)

        url = 'http://mol.cartodb.com/api/v2/sql?%s' % (urllib.urlencode(dict(q=sql, api_key=api_key)))
        logging.info(url)
        value = urlfetch.fetch(url, deadline=60).content

        self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)


application = webapp2.WSGIApplication(
    [('/userdata/put', PutHandler),('/userdata/del', DelHandler),],
    debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
