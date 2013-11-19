# Developing the app

This is the Map of Life web app. It's built using HTML5, CSS, and JavaScript. It rides on the Google App Engine platform for hosting, and leverages a hosted instance of [CartoDB](https://github.com/vizzuality/cartodb) by sending it CORS requests to the [Maps API](http://developers.cartodb.com/api/maps.html) and [SQL API](http://developers.cartodb.com/api/sql.html).

# Ubuntu environment

The app is hosted on GitHub, so we'll need to have the [Git](http://git-scm.com) client installed:

```bash
$ sudo apt-get install git
```

Next, let's go ahead and clone the project to our computer:

```bash
$ git clone git@github.com:MapofLife/MOL.git
```
        
To run the app locally for development, we need to install Python 2.7 and the latest Google App Engine Python SDK.

```bash
# Install Python 2.7
$ sudo apt-get update
$ sudo apt-get install python2.7

# Install Google App Engine Python SDK
$ mkdir ~/bin
$ cd ~/bin
$ curl -O http://googleappengine.googlecode.com/files/google_appengine_1.6.2.zip
$ unzip google_appengine_1.6.2.zip
$ export PATH=$PATH:~/bin/google_appengine # Add this line to ~/.bashrc
```

Finally, get into the `/app` directory, and let's fire up the development server!

```bash
$ cd MOL/app
$ dev_appserver.py ./
```

BOOM! You should be able to access the app at [http://localhost:8080](http://localhost:8080).

# Backends

We're using [App Engine backends](http://code.google.com/appengine/docs/python/backends/) for executing long running jobs that pre-cache CartoDB queries. For example, one of these jobs queries CartoDB for a distict list of `scientificname`, and for each one, performs a second CartoDB search profile query (e.g., a row per source/type) and stores the results in the `CacheItem` entity.

Backends are configured in `backends.yaml` and require the python-mysqldb modules, Google App Engine SDK 1.6.2+, and Python 2.7. 


To use backends with the development server via `dev_appserver.py`, first clear the datastore:

```bash
$ dev_appserver.py --clear_datastore
```
Then start it using

```bash
$ dev_appserver.py --use_sqlite --backends .
```

Then populate auto-complete fields by hitting  [http://localhost:8080/admin/build-search-cache](http://localhost:8080/admin/build-search-cache), but make sure the `LIMIT` is low enough (e.g., 10) [in this file](https://github.com/MapofLife/MOL/blob/develop/app/search_cache_backend.py#L140) so that it's fast. 

Backends are fired off using the taskqueue API, so keep an eye on the taskqueue admin console:

```
http://localhost:8080/_ah/admin/queues
```

When you're ready to deploy or update backends to the production servers on App Engine, use this command:

```shell
$ appcfg.py backends -V {app version} . update
```

Definitely check out [all of the available commands](http://code.google.com/appengine/docs/python/backends/overview.html#Commands) for backends.


# Emacs

You can setup Emacs with a JavaScript REPL which is really nice for hacking on MOL code since it's mainly written in JavaScript. If you need to install Emacs, it's easy, and here's a [great starting point](https://github.om/whizbangsystems/emacs-starter-kit). Just follow the instructions in the README.

# REPL setup

First install [Rhino](http://www.mozilla.org/rhino) which is a command line interface for JavaScript. On Ubuntu:

```bash
$ sudo apt-get install rhino
```

Next, to get the JavaScript REPL going in Emacs, let's install the `js2-mode` and `js-comint` packages using the Emacs package manager. It's easy. From within Emacs, type `M-x package-list-packages` and then hit enter. Find the packages in the list, press the `i` key next to each one, and then press the `x` key which installs all selected packages. 

The last step is adding the following to the end of your `~/.emacs.d/init.el` configuration file:

```clojure
(require 'js-comint)
(setq inferior-js-program-command "/usr/bin/js")
(add-hook 'js2-mode-hook '(lambda () 
        		    (local-set-key "\C-x\C-e" 'js-send-last-sexp)
			    (local-set-key "\C-\M-x" 'js-send-last-sexp-and-go)
			    (local-set-key "\C-cb" 'js-send-buffer)
			    (local-set-key "\C-c\C-b" 'js-send-buffer-and-go)
			    (local-set-key "\C-cl" 'js-load-file-and-go)))
```

That's it! 

Restart Emacs, get into `js2-mode` by typing `M-x js2-mode` and hitting enter, and then type `M-x run-js` and you are SET! You'll get a JavaScript REPL in a buffer where you can evaluate code. 

## Running MOL code

I find it helpful to redefine the `print` function so that it prints out object properties:

```bash
js> print = function(x){return JSON.stringify(x)};
```

Next, MOL code is sandboxed using the [Sandbox Pattern](http://my.safaribooksonline.com/book/programming/javascript/9781449399115/object-creation-patterns/sandbox_pattern), and if you're not familiar with it, [check out this file](https://github.com/MapofLife/MOL/blob/develop/app/js/mol.js) so see it in action.

To test functions within a sandboxed module, you need a little workaround. Let's look at an example module:

```javascript
/**
 * This module provides support for rendering search results.
 */
mol.modules.core = function(mol) { 
    
    mol.core = {};
    
    mol.core.getLayerId = function(name, type) {
        return 'layer-{0}-{1}'.format(name.trim(), type.trim());
    };
    
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('-'),
            name = tokens[1],
            type = tokens[2];
        
        return {
            id: id,
            name: name,
            type: type            
        };
    };
};
```

If you tried testing the `getLayerId` function, the REPL would complain that `mol` isn't defined. So let's define it! Here's the pattern to workaround the sandbox pattern in the REPL:

```bash
js> mol = {};
js> mol.modules = {};
js> mol.modules.core(mol)
```

Then you can send the entire module buffer to the REPL via `C-cb`, and then you can test the `getLayerId` function like this:

```bash
js> print(mol.core.getLayerFromId('layer-aaron-dude'))
{"id":"layer-aaron-dude","name":"aaron","type":"dude"}
```

Note: If you modify the module, you have to send the entire module buffer to the REPL and re-run `mol.modules.core(mol)` for the changes to take effect. 
