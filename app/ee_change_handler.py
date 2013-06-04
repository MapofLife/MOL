from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app


import os
import ee
import webapp2
import httplib2
import urllib
import logging
from google.appengine.api import urlfetch

import json
from oauth2client.appengine import AppAssertionCredentials

#Global variables
EE_URL = 'https://earthengine.googleapis.com'
CDB_URL = 'http://mol.cartodb.com/api/v2/sql'

# The OAuth scope URL for the Google Earth Engine API.
SCOPES = ('https://www.googleapis.com/auth/earthengine.readonly', 
          'https://www.googleapis.com/auth/earthbuilder.readonly')
SCOPES = ' '.join(SCOPES)
credentials = AppAssertionCredentials(scope=SCOPES)


class MainPage(webapp2.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def get(self):

        ee.Initialize(credentials, EE_URL)

        sciname = self.request.get('sciname', None)
        habitats = self.request.get('habitats', None)
        elevation = self.request.get('elevation', None)
        ##year = self.request.get('year', None)
        ##get_area = self.request.get('get_area', 'false')
        ee_id = self.request.get('ee_id', None)
        
        gme_assets = {
            '2010' : 'GME/images/04040405428907908306-17118360656965716769',
            '2011' : 'GME/images/04040405428907908306-08991745517214812316'
        }
        cover = ee.ImageCollection(ee.Image('MCD12Q1/MCD12Q1_005_2001_01_01').select('Land_Cover_Type_1'))
        
        for year in range(2002,2010):
            #Get land cover and elevation layers
            if int(year) < 2010:
                cover = ee.ImageCollection(ee.Image('MCD12Q1/MCD12Q1_005_%s_01_01' % (year)).select('Land_Cover_Type_1'))
            else: 
                cover = ee.ImageCollection(ee.Image(gme_assets[year]))
            
            
            
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
            mapid = result.getMapId({
                'palette': '000000,FFAA00',
                'max': 1,
                'opacity': 0.5
            })
            template_values = {
                'mapid' : mapid['mapid'],
                'token' : mapid['token'],
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

            region = region.setProperties(properties)

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

            self.render_template('ee_count.js', template_values)

application = webapp2.WSGIApplication([ ('/', MainPage), ('/.*', MainPage) ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
