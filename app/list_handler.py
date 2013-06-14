"""This module executes and logs species list requests """

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

api_key = ""
cdb_url = "http://mol.cartodb.com/api/v2/sql?%s"

taxa_list = [
        {'class': 'aves',
         'dataset_id': 'iucn_birds'}, 
        {'class': 'mammalia',
         'dataset_id': 'iucn_mammals'},
        {'class': 'reptilia',
         'dataset_id': 'iucn_reptiles'},
        {'class': 'amphibia',
         'dataset_id': 'iucn_amphibians'},
        {'class': 'palm',
	 'dataset_id': 'new_world_palms'},
	{'class': 'tree',
	 'dataset_id': 'na_trees'},
	{'class': 'seagrass',
         'dataset_id': 'iucn_species2011_seagrasses'},
	{'class': 'fish',
	 'dataset_id': 'na_fish'},
        {'class': 'ant',
         'dataset_id': 'ant_genera_of_the_world'}
       ]

class ListHandler(webapp2.RequestHandler):
    def handle_result(self, rpc, clas):
        logging.info("You called back!")
        result = rpc.get_result()
        try:
           result = rpc.get_result()
           if result.status_code == 200 and clas['class'] != 'log':
               logging.info('Adding result')
               self.results["results"].append({'class': clas['class'], 'species': json.loads(result.content)["rows"]})
               logging.info("got it")
               if len(self.results["results"]) >= len(self.rpcs)-1:
                   self.results["success"]=True
                   self.response.headers["Content-Type"] = "application/json"
                   self.response.headers['Access-Control-Allow-Origin'] = '*'
                   self.response.out.write(json.dumps(self.results))
           else:
               logging.info(result.content)
        except urlfetch.DownloadError:
            logging.error("Ruh roh.")
            self.results["success"]=False
            self.results["results"]=None
            self.response.headers["Content-Type"] = "application/json"
            self.response.headers['Access-Control-Allow-Origin'] = '*'
            self.response.out.write(json.dumps(self.results))

    def create_callback(self,rpc, taxa):
        return lambda: self.handle_result(rpc, taxa)
    
    def get(self):
        self.rpcs = []
        self.results = {'results': [], 'success': False }
        
        log_sql = """INSERT INTO list_log (dataset_id, lon, lat, radius, taxa, ip) 
           VALUES ('%s',%f,%f,%i,'%s', '%s')"""
        list_sql = "SELECT * FROM get_species_list('%s',%f,%f,%i,'%s')"

        
        rpc = urlfetch.create_rpc()
        ip = self.request.remote_addr
        lat = float(self.request.get('lat',None))
        lon = float(self.request.get('lon',None))
        radius = int(self.request.get('radius',None))
        taxa = cleanup(self.request.get('taxa', 'all'))
        dataset_id = cleanup(self.request.get('dsid', 'all'))
        
        # Log the request
        log_sql = log_sql % (
            dataset_id, float(lon), float(lat), int(radius), taxa, ip)
        rpc.callback = self.create_callback(
            rpc, {'class': 'log', 'dataset_id' : 'all'})
        log_url = cdb_url % (urllib.urlencode(dict(q=log_sql, api_key=api_key)))
        urlfetch.make_fetch_call(rpc, log_url)
        self.rpcs.append(rpc)

        # Make the list
        # for a single taxa
        if taxa != 'all':
            list_sql = list_sql % (
                dataset_id, float(lon), float(lat), int(radius), taxa) 
            list_url = cdb_url % (urllib.urlencode(dict(q=list_sql)))
            value = urlfetch.fetch(list_url, deadline=60).content
            
            self.response.headers["Content-Type"] = "application/json"
            self.response.out.write(value)
        # for all taxa
        else:
            for taxa in taxa_list:
                rpc = urlfetch.create_rpc(deadline=240)
                logging.info(json.dumps(taxa))
                rpc.callback = self.create_callback(rpc, taxa)
                
                sub_list_sql = list_sql % (
                    str(taxa["dataset_id"]),
                    float(lon), 
                    float(lat), 
                    int(radius), 
                    str(taxa["class"])
                )
                
                list_url = cdb_url % (urllib.urlencode(dict(q=sub_list_sql)))
                urlfetch.make_fetch_call(rpc, list_url)
                self.rpcs.append(rpc)
       
        for rpc in self.rpcs:
            rpc.wait()


def cleanup (str):
    if str is not None:
        return str.lower().replace('drop','').replace('alter','').replace(
           'insert','').replace('delete','').replace('select','').replace(
           'update','').replace(' ','').replace('%20','').replace(
           'create','').replace('\n','').replace('\\','').replace('/','').replace(
           '.','')
    else:
        return None
            
application = webapp2.WSGIApplication(
    [('/list', ListHandler)],
    debug=False)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
