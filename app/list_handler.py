"""This module executes and logs species list requests """

__author__ = 'Jeremy Malczyk'


# Standard Python imports
#import urllib
import webapp2
import urllib
import logging


# Google App Engine imports

from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app

api_key = ""
cdb_url = "http://mol.cartodb.com/api/v2/sql?%s"

class ListHandler(webapp2.RequestHandler):
    def get(self):
        
        log_sql = """INSERT INTO list_log (dataset_id, lon, lat, radius, taxa) 
           VALUES ('%s',%f,%f,%i,'%s')"""
        list_sql = "SELECT * FROM get_species_list('%s',%f,%f,%i,'%s')"

        
        rpc = urlfetch.create_rpc()
        lat = float(self.request.get('lat'))
        lon = float(self.request.get('lon'))
        radius = int(self.request.get('radius'))
        taxa = cleanup(self.request.get('taxa'))
        dataset_id = cleanup(self.request.get('dsid'))
        
        # Log the request
        log_sql = log_sql % (
            dataset_id, float(lon), float(lat), int(radius), taxa)
        log_url = cdb_url % (urllib.urlencode(dict(q=log_sql, api_key=api_key)))
        urlfetch.make_fetch_call(rpc, log_url)
        
        # Make the list
        list_sql = list_sql % (
            dataset_id, float(lon), float(lat), int(radius), taxa) 
        list_url = cdb_url % (urllib.urlencode(dict(q=list_sql)))
        value = urlfetch.fetch(list_url, deadline=60).content

        #Write the response
        self.response.headers["Content-Type"] = "application/json"
        self.response.out.write(value)
        
        try:
            result = rpc.get_result()
            if result.status_code == 200:
                text = result.content
        except urlfetch.DownloadError:
            logging.error(
                "Error logging get_species_list('%s',%f,%f,%i,'%s')" % 
                (dataset_id, lon, lat, radius, taxa)
            )
            
def cleanup (str):
    return str.lower().replace('drop','').replace('alter','').replace(
       'insert','').replace('delete','').replace('select','').replace(
       'update','').replace(' ','').replace('%20','').replace(
       'create','').replace('\n','').replace('\\','').replace('/','').replace(
       '.','')
            
            
application = webapp2.WSGIApplication(
    [('/list', ListHandler)],
    debug=False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
