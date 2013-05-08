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

SCOPES = ('https://www.googleapis.com/auth/earthengine.readonly', 'https://www.googleapis.com/auth/earthbuilder.readonly')
SCOPES = ' '.join(SCOPES)
credentials = AppAssertionCredentials(scope=SCOPES)

ee.Initialize(credentials, 'https://earthengine.googleapis.com')

consensus = {
   '1' : 'GME/images/04040405428907908306-09641357241993258296',
   '2' : 'GME/images/04040405428907908306-01230937887359499727',
   '3' : 'GME/images/04040405428907908306-18223429773227125129',
   '4' : 'GME/images/04040405428907908306-09712866254583111520',
   '5' : 'GME/images/04040405428907908306-16806939064387117948',
   '6' : 'GME/images/04040405428907908306-09466105632312189075',
   '7' : 'GME/images/04040405428907908306-01528081379737976643',
   '8' : 'GME/images/04040405428907908306-09307790578092642643',
   '9' : 'GME/images/04040405428907908306-06543039062397146187',
   '10': 'GME/images/04040405428907908306-07718168419459114705',
   '11': 'GME/images/04040405428907908306-00618660600894167786',
   '12': 'GME/images/04040405428907908306-08562313830554070372'
}

class MainPage(webapp2.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def get(self):

	ee.Initialize(credentials, EE_URL)

	sciname = self.request.get('sciname', None)
	habitats = self.request.get('habitats', None)
	elevation = self.request.get('elevation', None)
	get_area = self.request.get('get_area', 'false')
	ee_id = self.request.get('ee_id', None)

	#Get land cover and elevation layers
	elev = ee.Image('srtm90_v4')

	output = ee.Image(0)
	empty = ee.Image(0).mask(0)

	species = ee.Image(ee_id)

	min = int(elevation.split(',')[0])
	max = int(elevation.split(',')[1])
	habitat_list = habitats.split(",")

	output = output.mask(species)

	for pref in habitat_list:
	    cover = ee.Image(consensus[pref])
	    output = output.add(cover)

	output = output.where(elev.lt(min).Or(elev.gt(max)),0)


	result = output.mask(output)

	       
	mapid = result.getMapId({
		'palette': '5E4FA2,3288BD,66C2A5,ABDDA4,E6F598,FFFFBF,FEE08B,FDAE61,F46D43,D53E4F,9E0142',
		'min': 0,
		'max': 100
	})
	template_values = {
		'mapid' : mapid['mapid'],
		'token' : mapid['token']
	}
	self.render_template('ee_mapid.js', template_values)
		

application = webapp2.WSGIApplication([ ('/', MainPage), ('/.*', MainPage) ], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
