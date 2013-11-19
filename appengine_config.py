# This was in 'homepage'; I don't know if it still does anything
# but I'm keeping it around just in case. Delete it if you're use
# it's unnecessary. -- Gaurav, May 7, 2012.

def webapp_add_wsgi_middleware(app):
    from google.appengine.ext.appstats import recording
    app = recording.appstats_wsgi_middleware(app)
    return app
