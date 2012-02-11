from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import logging
import os
import random

if 'SERVER_SOFTWARE' in os.environ:
    PROD = not os.environ['SERVER_SOFTWARE'].startswith('Development')
else:
    PROD = True

class BaseHandler(webapp.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def push_html(self, f):
        path = os.path.join(os.path.dirname(__file__), "html", f)
        self.response.out.write(open(path, 'r').read())

class MapPage(BaseHandler):
    def get(self):
        self.render_template('map-index-template.html', 
                             {'prod': PROD, 'r': random.random()})

class TestPage(BaseHandler):
    def get(self):
        self.render_template('design.html', {})

application = webapp.WSGIApplication(
         [('/', MapPage),
         ('/design', TestPage)],
         debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
