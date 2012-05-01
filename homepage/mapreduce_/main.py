#!/usr/bin/env python
#
# Copyright 2010 Google Inc.
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

"""Main module for map-reduce implementation.

This module should be specified as a handler for mapreduce URLs in app.yaml:

  handlers:
  - url: /mapreduce(/.*)?
    login: admin
    script: mapreduce/main.py
"""



import wsgiref.handlers

from google.appengine.ext import webapp
from mapreduce import handlers
from mapreduce import status
from google.appengine.ext.webapp import util


STATIC_RE = r".*/([^/]*\.(?:css|js)|status|detail)$"


class RedirectHandler(webapp.RequestHandler):
    """Redirects the user back to the status page."""

    def get(self):
        new_path = self.request.path
        if not new_path.endswith("/"):
            new_path += "/"
        new_path += "status"
        self.redirect(new_path)


def create_application():
    """Create new WSGIApplication and register all handlers.

    Returns:
      an instance of webapp.WSGIApplication with all mapreduce handlers
      registered.
    """
    return webapp.WSGIApplication([
        # Task queue handlers.
        (r".*/worker_callback", handlers.MapperWorkerCallbackHandler),
        (r".*/controller_callback", handlers.ControllerCallbackHandler),
        (r".*/kickoffjob_callback", handlers.KickOffJobHandler),

        # RPC requests with JSON responses
        # All JSON handlers should have /command/ prefix.
        (r".*/command/start_job", handlers.StartJobHandler),
        (r".*/command/cleanup_job", handlers.CleanUpJobHandler),
        (r".*/command/abort_job", handlers.AbortJobHandler),
        (r".*/command/list_configs", status.ListConfigsHandler),
        (r".*/command/list_jobs", status.ListJobsHandler),
        (r".*/command/get_job_detail", status.GetJobDetailHandler),

        # UI static files
        (STATIC_RE, status.ResourceHandler),

        # Redirect non-file URLs that do not end in status/detail to status page.
        (r".*", RedirectHandler),
    ],
    debug=True)


APP = create_application()


def main():
    util.run_wsgi_app(APP)


if __name__ == "__main__":
    main()