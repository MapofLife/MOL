"""This module executes area calculations for all modis years"""

__author__ = 'Jeremy Malczyk'


# Standard Python imports
#import urllib
import webapp2
import urllib
import logging
import json


# Google App Engine imports

from google.appengine.api import urlfetch
from google.appengine.ext.webapp.util import run_wsgi_app




class changeHandler(webapp2.RequestHandler):
    def get(self):
        
        self.area_results = [['Year','Area (sq km)']]
        self.mapid_results = {}
        self.rpcs = []
        
        self.url = 'http://change-beta.map-of-life.appspot.com/ee_modis?%s'
          
        self.habitats = self.request.get('habitats', None)
        self.elevation = self.request.get('elevation', None)
        self.ee_id = self.request.get('ee_id', None)
        self.get_area = self.request.get('get_area', "true")

        for i in range(2001,2010):
            year_url = self.url % (
                urllib.urlencode(
                    dict(habitats=self.habitats, 
                         elevation=self.elevation, 
                         year=i, 
                         ee_id=self.ee_id, 
                         get_area=self.get_area
                    )
                )
            )
            rpc = urlfetch.create_rpc(deadline=240)
            rpc.callback = self.create_callback(rpc, i)
            logging.info('Calling %s' % year_url)
            urlfetch.make_fetch_call(rpc, year_url)
            self.rpcs.append(rpc)
        
        for rpc in self.rpcs:
            rpc.wait()
    def handle_result(self, rpc, year):
        logging.info("You called back!")
        result = rpc.get_result()
        try:
           result = rpc.get_result()
           if result.status_code == 200 and self.get_area == 'true' :
               self.area_results.append([year, json.loads(result.content)["clipped_area"]])
               if len(self.area_results) > len(self.rpcs):
                   self.response.out.write(json.dumps(self.area_results))
           else:
               self.mapid_results["modis_%s" % year] = json.loads(result.content)["urlPattern"]
               if len(self.mapid_results) >= len(self.rpcs):
                   self.response.out.write(json.dumps(self.mapid_results))
               
        except urlfetch.DownloadError:
            logging.error("Ruh roh.")

    def create_callback(self,rpc, year):
        return lambda: self.handle_result(rpc, year)
   
application = webapp2.WSGIApplication(
    [('/ee_modis_change', changeHandler)],
    debug=False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()