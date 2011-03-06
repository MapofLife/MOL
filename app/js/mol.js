var MOL = MOL || {};    

MOL.init = function() {
        
    // Function for building namespaces:
    MOL.ns = function(namespace) {
        var parts = namespace.split('.');
        var parent = MOL;
        var i;
        if (parts[0] === 'MOL') {
            parts = parts.slice(1);
        }
        for (i = 0; i < parts.length; i += 1) {
            if (typeof parent[parts[i]] === 'undefined') {
                parent[parts[i]] = {};
            }
            parent = parent[parts[i]];
        }
        return parent;
    };
    
    // Creates a namespace for utilities:
    MOL.ns('MOL.util');

    // Serializes an object into a URL encoded GET query string.
    MOL.util.serialize = function(obj) {
        var str = [];
        for(var p in obj)
            str.push(p + "=" + encodeURIComponent(obj[p]));
        return str.join("&");
    };

    MOL.util.parse = function(query) {
        var e,
            a = /\+/g,  
            r = /([^&=]+)=?([^&]*)/g,
            d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
            q = query.replace('#', '').replace('?', '');
        var urlParams = {};
        while ((e = r.exec(q))) {
            urlParams[d(e[1])] = d(e[2]);
        }
        return urlParams;
    };
    
    // Changes Underscore.js settings to perform Mustache.js style templating:
    _.templateSettings = {
        interpolate : /\{\{(.+?)\}\}/g
    };
    
    MOL.SpeciesModel = Backbone.Model.extend({});

    MOL.SearchResults = Backbone.Collection.extend({
        model: MOL.SpeciesModel,

        url: function() {
            return '/api/taxonomy?' + this.query;
        },

        setQuery: function(query) {
            this.query = query;
        }
    });
    

    /**
     * Search view. Dispatches browser events to activity. 
     */
    MOL.SearchView = Backbone.View.extend({
        el: $('#SearchView'),        

        events: {
            "keyup #searchBox": "searchBoxKeyUp",
            "click #searchButton": "searchButtonClick"
        },

        // Initializes the view:
        initialize: function() {
            this.box = $('#searchBox');
            this.button = $('#searchButton');
            this.results = $('#searchResults');
            this.tableContainer = $('#searchTable')[0];
            this.table = new google.visualization.Table(this.tableContainer);
        },
        
        // Returns the text in the #searchBox:
        getSearchText: function() {
            return this.box.val() || this.box.attr('placeholder');
        },
        
        renderResults: function(json) {
            var template = $('#foo').html();
            var html = Mustache.to_html(template, json).replace(/^\s*/mg, '');
            $('#searchResults').html(html);
        },

        // Handles keyup event on the #searchBox and dispatches to activity.
        searchBoxKeyUp: function(evt) {
            this.activity.searchBoxKeyUp(evt);
        },

        // Handles click event on the #searchButton and dispatches to activity.
        searchButtonClick: function(evt) {
            this.activity.searchButtonClick(evt);
        },

        // Sets the activity:
        setActivity: function(activity) {
            this.activity = activity;
        },

        // Sets the #searchBox text:
        setSearchText: function(t) {            
            this.box.val(t);
        }
    });

    /**
     * Search activity.
     */
    MOL.SearchActivity = function(view) {
        if (!(this instanceof MOL.SearchActivity)) {
            return new MOL.SearchActivity(view);
        }
        this.view = view;
        this.view.setActivity(this);
        this.pageSize = 2;
        this.limit = 2;
        this.offset = 0;
        this.currentDataTable = null;
        this.table = this.view.table;
        this.currentPageIndex = 0;

        // Wire the up callback for paging:
        var self = this;
        var addListener = google.visualization.events.addListener;
        addListener(this.view.table, 'page', function(e) {
            self.handlePage(e);
        });

        // Configure query options:
        this.tableOptions = {page: 'event', 
                        showRowNumber: true,
                        allowHtml: true, 
                        pagingButtonsConfiguration: 'both',
                        pageSize: this.pageSize};
        this.updatePagingState(0);
    };
    
    MOL.SearchActivity.prototype.updatePagingState = function(pageIndex) {
        var pageSize = this.pageSize;
        
        if (pageIndex < 0) {
            return false;
        }
        var dataTable = this.currentDataTable;
        if ((pageIndex == this.currentPageIndex + 1) && dataTable) {
            if (dataTable.getNumberOfRows() <= pageSize) {
                return false;
            }
        }
        this.currentPageIndex = pageIndex;
        var newStartRow = this.currentPageIndex * pageSize;
        // Get the pageSize + 1 so that we can know when the last page is reached.
        this.limit = pageSize + 1;
        this.offset = newStartRow;
        // Note: row numbers are 1-based yet dataTable rows are 0-based.
        this.tableOptions['firstRowNumber'] = newStartRow + 1;
        return true;
    };

    MOL.SearchActivity.prototype.sendAndDraw = function() {
        var cb = new MOL.AsyncCallback(this.onSuccess(), this.onFailure);
        var params = this.getSearchParams();
        this.table.setSelection([]);
        MOL.api.execute({action: 'search', params: params}, cb);
        MOL.controller.saveLocation(MOL.util.serialize(params));
    };

    MOL.SearchActivity.prototype.handlePage = function(properties) {
        var localTableNewPage = properties['page']; // 1, -1 or 0
        var newPage = 0;
        if (localTableNewPage != 0) {
            newPage = this.currentPageIndex + localTableNewPage;
        }
        if (this.updatePagingState(newPage)) {
            this.sendAndDraw();
        }
    };

    // Goes to the place by updating the view:
    MOL.SearchActivity.prototype.go = function(place) {
        var params = place.params;
        this.limit = params.limit || this.limit;
        this.offset = params.offset || this.offset;
        this.currentPageIndex = this.offset;
        this.view.setSearchText(params.q);
        var newStartRow = this.currentPageIndex * this.pageSize;
        this.tableOptions['firstRowNumber'] = newStartRow + 1;
        this.sendAndDraw();            
    };
        
    // Clicks the search button if the enter key was pressed:
    MOL.SearchActivity.prototype.searchBoxKeyUp = function(evt) {
        if (evt.keyCode === 13) {
            this.searchButtonClick(evt);
        }
    };
    
    MOL.SearchActivity.prototype.getSearchParams = function() {
        return {q: this.view.getSearchText(),
                limit: this.limit,
                offset: this.offset,
                tqx: true};
    };
    
    MOL.SearchActivity.prototype.onSuccess = function() {
        var self = this;
        return function(json) {
            var data = null;
            self.currentDataTable = null;
            google.visualization.errors.removeAll(self.view.tableContainer);            
            eval("data = " + json);
            self.currentDataTable = new google.visualization.DataTable(data);
            self.table.draw(self.currentDataTable, self.tableOptions);
        };
    };
    
    MOL.SearchActivity.prototype.onFailure = function(error) {
        alert('Failure: ' + error);
    };
    
    // Saves a location and submits query to the server:
    MOL.SearchActivity.prototype.searchButtonClick = function(evt) {
        this.offset = 0;
        this.currentPageIndex = 0;
        this.sendAndDraw();
    };
       
    /**
     * The controller.
     */
    MOL.Controller = function() {
        var controller = Backbone.Controller.extend({
            initialize: function() {
                var view = new MOL.SearchView();
                this.searchActivity = new MOL.SearchActivity(view);
            },

            routes: {
                ":query": "search"
            },
        
            // Handles the search request route:
            search: function(query) {
                this.searchActivity.go({params:MOL.util.parse(query)});
            }
        });
        return new controller();
    };
        
    /**
     * Asynchronous callback that handles success and failure callbacks.
     */
    MOL.AsyncCallback = function(onSuccess, onFailure) {
        if (!(this instanceof MOL.AsyncCallback)) {
            return new MOL.AsyncCallback(onSuccess, onFailure);
        }
        this.onSuccess = onSuccess;
        this.onFailure = onFailure;
    };


    /**
     * API proxy.
     */
    MOL.ApiProxy = function() {
        if (!(this instanceof MOL.ApiProxy)) {
            return new MOL.ApiProxy();
        }
        this.execute = function(request, cb) {
            if (request.action === 'search') {
                var xhr = $.post('/api/taxonomy', request.params, 'json');
                xhr.success(cb.onSuccess);
                xhr.error(cb.onError);
            }
        };
    };
    
    
    /**
     * Event bus.
     */
    MOL.EventBus = function() {
        if (!(this instanceof MOL.EventBus)) {
            return new MOL.EventBus();
        }
        _.extend(this, Backbone.Events);
    };

    // Starts the app:
    MOL.api = new MOL.ApiProxy();
    MOL.bus = new MOL.EventBus();
    MOL.controller = new MOL.Controller();
    Backbone.history.start();
};
