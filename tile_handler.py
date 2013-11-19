"""This module contains a tile cache handler."""

__author__ = 'Aaron Steele'

# MOL imports
import cache

# Standard Python imports
import hashlib
import logging
import os
import urllib
import webapp2

# Google App Engine imports
from google.appengine.api import memcache
from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

if 'SERVER_SOFTWARE' in os.environ:
    PROD = not os.environ['SERVER_SOFTWARE'].startswith('Development')
else:
    PROD = True

app_id = os.environ['CURRENT_VERSION_ID'].split('.')[0]
if PROD:
    host_prefix = 'http'
    if os.environ['SERVER_PORT'] == 443:
        host_prefix = 'https'
    app_host = host_prefix + '://' + os.environ['SERVER_NAME'] 
else:
    app_host = 'http://localhost:8080'

class TileHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        tile_url = self.request.url.replace(app_host, 'http://mol.cartodb.com')
        tile_key = 'tile-%s' % hashlib.sha224(tile_url).hexdigest() # tc means Tile Cache
        tile_png = memcache.get(tile_key) # Check memcache
        if not tile_png:
            tile_png = cache.get(tile_key, value_type='blob') # Check datastore cache
            if not tile_png:
                result = urlfetch.fetch(tile_url, deadline=60) # Check CartoDB
                if result.status_code == 200 or result.status_code == 304:
                    tile_png = result.content
                    cache.add(tile_key, tile_png, value_type='blob')
                    memcache.add(tile_key, tile_png)
            else:
                    memcache.add(tile_key, tile_png)
        if not tile_png:
            self.error(404)
        else:
            self.response.headers["Content-Type"] = "image/png"
            self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
            self.response.out.write(tile_png)

class GridHandler(webapp2.RequestHandler):
    """Request handler for cache requests."""

    def get(self):
        grid_url = self.request.url.replace(app_host, 'http://mol.cartodb.com')
        grid_key = 'utfgrid-%s' % hashlib.sha224(grid_url).hexdigest() # gc means Grid Cache
        grid_json = memcache.get(grid_key)
        if not grid_json:
            grid_json = cache.get(grid_key)            
            if not grid_json:
                result = urlfetch.fetch(grid_url, deadline=60)
                if result.status_code == 200 or result.status_code == 304:                    
                    grid_json = result.content
                    cache.add(grid_key, grid_json)
                    memcache.add(grid_key, grid_json)
            else:
                memcache.add(grid_key, grid_json)
        if not grid_json:
            self.error(404)
        else:
            self.response.headers["Content-Type"] = "application/json"
            self.response.headers["Cache-Control"] = "max-age=2629743" # Cache 1 month
            self.response.out.write(grid_json)                    
                    
application = webapp2.WSGIApplication(
    [('/tiles/[a-zA-Z0-9_-]+/[\d]+/[\d]+/[\d]+.png?.*', TileHandler),
     ('/tiles/[a-zA-Z0-9_-]+/[\d]+/[\d]+/[\d]+.grid.json?.*', GridHandler),], 
    debug=True)
         
def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
