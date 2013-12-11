from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


import os
import ee
import config
import webapp2
import httplib2
import urllib
import logging
from google.appengine.api import urlfetch

import json
from oauth2client.appengine import AppAssertionCredentials


class MainPage(webapp2.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def getRandomPoints(self,sciname):
        cdburl = 'http://mol.cartodb.com/api/v1/sql?q=%s'
        sql = "Select " \
            "ST_X(ST_Transform(the_geom_webmercator,4326)) as lon, " \
            "ST_Y(ST_Transform(the_geom_webmercator,4326)) as lat, " \
            "1 as val " \
            "FROM get_tile_beta('gbif_aug_2013','%s') " \
            "order by random() limit 1000"
        url =  cdburl % (sql % (sciname))
            
        self.points = urlfetch.fetch(url)
        logging.info(url)
        logging.info(self.points)
        logging.info("HELLO!!!!")
        
    def get(self):

        ee.Initialize(config.EE_CREDENTIALS, config.EE_URL)

        sciname = self.request.get('sciname', None)
        habitats = self.request.get('habitats', None)
        elevation = self.request.get('elevation', None)
        year = self.request.get('year', None)
        get_area = self.request.get('get_area', 'false')
        ee_id = self.request.get('ee_id', None)

        #Get land cover and elevation layers
        cover = ee.Image('MCD12Q1/MCD12Q1_005_%s_01_01' % (year)).select('Land_Cover_Type_1')
        elev = ee.Image('srtm90_v4')

        output = ee.Image(0)
        empty = ee.Image(0).mask(0)


        species = ee.Image(ee_id)

        #parse the CDB response


        min = int(elevation.split(',')[0])
        max = int(elevation.split(',')[1])
        habitat_list = habitats.split(",")


        output = output.mask(species)

        for pref in habitat_list:
            output = output.where(cover.eq(int(pref)).And(elev.gt(min)).And(elev.lt(max)),1)

        result = output.mask(output)

        if(get_area == 'false'):
            
            self.getRandomPoints(sciname)
            # TODO: next:
            # do something with self.points in ee 
            # paint points into result
            
               
            mapid = result.getMapId({
                'palette': '000000,85AD9A',
                'max': 1,
                'opacity': 0.5
            })
            template_values = {
                'mapid' : mapid['mapid'],
                'token' : mapid['token'],
                # add points stats to result
            }

            self.render_template('ee_mapid.js', template_values)
        else:
        #compute the area
          
	    area = ee.call("Image.pixelArea")
            sum_reducer = ee.call("Reducer.sum")
            
            area = area.mask(species)
            total = area.mask(result.mask())
          
            region = ee.Feature(ee.Feature.Polygon([[-179.9,-89.9],[-179.9,89.9],[179.9,89.9],[179.9, -89.9], [-179.9, -89.9]]))
	    geometry = region.geometry()

            ##compute area on 1km scale
            clipped_area = total.reduceRegion(sum_reducer,geometry,10000)
	    total_area = area.reduceRegion(sum_reducer,geometry,10000)

            properties = {'total': total_area, 'clipped': clipped_area}

            region = region.set(properties)

            data = ee.data.getValue({"json": region.serialize()})
            
	    #self.response.headers["Content-Type"] = "application/json"
            #self.response.out.write(json.dumps(data))
	    ta = 0
            ca = 0
            ta = data["properties"]["total"]["area"]
            ca = data["properties"]["clipped"]["area"]
            template_values = {
               'clipped_area': ca/1000000,
               'total_area': ta/1000000
            }
            self.response.out.write(json.dumps(template_values))
            self.render_template('ee_count.js', template_values)

application = webapp2.WSGIApplication([ ('/', MainPage), ('/.*', MainPage) ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
