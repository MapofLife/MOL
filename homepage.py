#!/usr/bin/env python
#
# Copyright 2010, 2012 Andrew W. Hill, Aaron Steele, Gaurav Vaidya
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from google.appengine.api import memcache as m, mail
from google.appengine.ext import webapp
from google.appengine.api import urlfetch
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
import os


memcache = m.Client()

if 'SERVER_SOFTWARE' in os.environ:
    PROD = not os.environ['SERVER_SOFTWARE'].startswith('Development')
else:
    PROD = True

class BaseHandler(webapp.RequestHandler):
    def render_template(self, f, template_args):
        path = os.path.join(os.path.dirname(__file__), "templates", f)
        self.response.out.write(template.render(path, template_args))

    def push_html(self, f):
        path = os.path.join(os.path.dirname(__file__), "templates/homepage", f)
        self.response.out.write(open(path, 'r').read())

class PeoplePage(BaseHandler):
    def get(self):
        self.push_html('people.html')

# class PartnersPage(BaseHandler):
#    def get(self):
#        self.push_html('partners.html')

class TechPage(BaseHandler):
    def get(self):
        self.push_html('tech.html')

class DemoPage(BaseHandler):
    def get(self):
         self.redirect("/")

class PressPage(BaseHandler):
    def get(self):
        result = urlfetch.fetch(url="http://mappinglife.wordpress.com/category/press/")
        content_type = result.headers.get("Content-Type")
        self.response.headers['Content-Type']=content_type
        self.response.out.write(result.content)

class MainPage(BaseHandler):
    def get(self):
        self.push_html('home.html')

application = webapp.WSGIApplication(
         [('/about', MainPage),
          ('/about/', MainPage),
          ('/about/tech', TechPage),
          ('/about/tech/', TechPage),
          ('/about/demo', DemoPage),
          ('/about/demo/', DemoPage),
          ('/about/people', PeoplePage),
          ('/about/people/', PeoplePage),
          ('/about/press', PressPage),
          ('/about/press/', PressPage)
#          ('/about/partners', PartnersPage),
#          ('/about/partners/', PartnersPage)
          ],
         debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
