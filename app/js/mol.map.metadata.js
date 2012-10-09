mol.modules.map.metadata = function(mol) {

    mol.map.metadata = {};

    mol.map.metadata.MetadataEngine = mol.mvp.Engine.extend(
        {
            init: function(proxy, bus) {
                this.proxy = proxy;
                this.bus = bus;
                this.cache_key = Math.random();
                this.sql = {
                    layer: '' +
                        'SELECT ' +
                        '   TEXT(\'{0}\') AS "Species name", ' +
                        '   t.title as "Type", ' +
                        '   CONCAT(\'<a href=\"\',p.url,\'\">\',p.title,\'</a>\') as "Provider", ' +
                        '   p.pubdate AS "Date" ' +
                        'FROM types t, providers p, (SELECT TEXT(\'{0}\') as scientificname, TEXT(\'{1}\') as type, TEXT(\'{2}\') as provider) s ' +
                        'WHERE ' +
                        '    s.provider = p.provider ' +
                        '    AND s.type = t.type ' +
                        'LIMIT 1',
                    dashboard: '' +
                        'SELECT Coverage as "Coverage", Taxon as "Taxon", ' +
                        '   dm.Description as "Description", ' +
                        '   CASE WHEN URL IS NOT NULL THEN CONCAT(\'<a target="_dashlink" href="\',dm.URL, \'">\', dm.URL, \'</a>\') ' +
                        '   ELSE Null END AS "URL", ' +
                        '   dm.Spatial_metadata as "Spatial Metadata", ' +
                        '   dm.Taxonomy_metadata as "Taxonomy Metadata", ' +
                        '   dm.seasonality as "Seasonality", ' +
                        '   dm.seasonality_more as "Seasonality further info", ' +
                        '   dm.date_range as "Date", ' +
                        '   dm.date_more as "Date further info", ' +
                        '   dm.Recommended_citation as "Recommended Citation" ' +
                        //'   CASE WHEN sm.sc <> \'\' THEN CONCAT(sm.sc,\', [\', sm.scientificname, \']. In: \', dm.Recommended_citation) ELSE dm.Recommended_citation END as "Recommended Citation", ' +
                        '   dm.Contact as "Contact" ' +
                        'FROM dashboard_metadata dm ' +
                        //'LEFT JOIN (SELECT scientificname, array_to_string(array_sort(array_agg(bibliographiccitation)), \',\') as sc, provider FROM polygons group by scientificname, provider having provider=\'iucn\' AND scientificname = \'{3}\') sm ' +
                        //'ON dm.provider = sm.provider ' +
                        'WHERE ' +
                        '   dm.provider = \'{0}\' ' +
                        '   AND dm.type =  \'{1}\' ' +
                        '   AND (dm.class = \'{2}\' OR dm.class = \'all\') ' +
                        '   AND dm.show ' +
                        'ORDER BY' +
                        '   class ASC',
                    types: '' +
                        'SELECT title as "Data Type", description AS "Description" FROM types where type = \'{0}\''

                }
            },

            /**
             * Starts the MenuEngine. Note that the container parameter is
             * ignored.
             */
            start: function() {
                this.displays = {};
                this.addEventHandlers();
            },
            getLayerMetadata: function (layer) {
                var self = this,
                    sql = this.sql['layer'].format(
                            layer.name, layer.type, layer.source),
                    params = {
                            sql:sql, 
                            key: 'lm-{0}-{1}-{2}-{3}'
                                .format(
                                    layer.name, 
                                    layer.type, 
                                    layer.source, 
                                    this.cache_key)},
                    action = new mol.services.Action(
                                'cartodb-sql-query', 
                                params),
                    success = function(action, response) {
                        var results = {layer:layer, response:response};
                        
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : 'metadata-{0}-{1}-{2}'
                                    .format(
                                        layer.name, 
                                        layer.type, 
                                        layer.source)}));
                        
                        if(!response.error) {
                            self.displays['metadata-{0}-{1}-{2}'
                                .format(
                                    layer.name, 
                                    layer.type, 
                                    layer.source)] 
                                = new mol.map.metadata.MetadataDisplay(results);
                        } else {
                            //self.getMetadata(layer);
                        }
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : 'metadata-{0}-{1}-{2}'
                                    .format(
                                        layer.name, 
                                        layer.type, 
                                        layer.source)}));
                    };

                if(this.displays['metadata-{0}-{1}-{2}'
                    .format(
                        layer.name, 
                        layer.type, 
                        layer.source)] == undefined) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-loading-indicator', 
                            {source : 'metadata-{0}-{1}-{2}'
                                .format(
                                    layer.name, 
                                    layer.type, 
                                    layer.source)}));
                    this.proxy
                        .execute(
                            action, 
                            new mol.services.Callback(success, failure));
                } else {
                    if(this.displays['metadata-{0}-{1}-{2}'
                        .format(
                            layer.name, 
                            layer.type, 
                            layer.source)].dialog("isOpen")) {
                        this.displays['metadata-{0}-{1}-{2}'
                            .format(
                                layer.name, 
                                layer.type, 
                                layer.source)].dialog("close");
                    } else {
                        this.displays['metadata-{0}-{1}-{2}'
                            .format(
                                layer.name, 
                                layer.type, 
                                layer.source)].dialog("open");
                    }
                }

            },
            getTypeMetadata:function (params) {
                var self = this,
                    type = params.type,
                    sql = this.sql['types'].format(type),
                    params = {
                            sql:sql,
                            key: 'tm-{0}-{1}'.format(type, this.cache_key)},
                    action = new mol.services.Action(
                                'cartodb-sql-query', 
                                params),
                    success = function(action, response) {
                        var results = {type:type, response:response};
                        
                        if(!results.response.error) {
                            if(results.response.total_rows > 0) {
                                self.displays['type-metadata-{0}'.format(type)]  
                                = new mol.map.metadata.MetadataDisplay(results);
                            }
                        }
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : 'type-metadata-{0}'.format(type)}));
                    };

                if(this.displays['type-metadata-{0}'
                    .format(type)] == undefined) {
                    this.proxy
                        .execute(
                            action, 
                            new mol.services.Callback(success, failure));
                } else {
                    if(this.displays['type-metadata-{0}'
                        .format(type)].dialog("isOpen")) {
                        this.displays['type-metadata-{0}'
                            .format(type)].dialog("moveToTop");
                    } else {
                        this.displays['type-metadata-{0}'
                            .format(type)].dialog("open");
                    }
                }
            },
            getDashboardMetadata: function (params) {
                var self = this,
                    type = params.type,
                    provider = params.provider,
                    _class = params._class,
                    name = params.name,
                    sql = this.sql['dashboard']
                            .format(provider, type, _class, name),
                    params = {
                            sql:sql,
                            key: 'dm0930-{0}-{1}-{2}-{3}'
                                .format(provider, type, _class, name)},
                    action = new mol.services.Action(
                                'cartodb-sql-query', 
                                params),
                    success = function(action, response) {
                        var results = {
                                        provider:provider, 
                                        type:type, 
                                        _class:_class, 
                                        response:response};
                        /*
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : 'dash-metadata-{0}-{1}-{2}'
                                    .format(provider, type, _class)}));
                        */
                        
                        if(!results.response.error) {
                            if(results.response.total_rows > 0) {
                                self.displays['dash-metadata-{0}-{1}-{2}-{3}'
                                    .format(provider, type, _class, name)]  
                                    = new mol.map.metadata.MetadataDisplay(
                                        results);
                            }
                        } else {
                            //self.getDasboardMetadata(
                                //{provider:provider, 
                                 //type:type, 
                                 //_class:_class});
                        }
                    },
                    failure = function(action, response) {
                        self.bus.fireEvent(
                            new mol.bus.Event(
                                'hide-loading-indicator', 
                                {source : 'metadata-{0}-{1}-{2}'
                                    .format(provider, type, _class)}));
                    };

                if(this.displays['dash-metadata-{0}-{1}-{2}-{3}'
                    .format(provider, type, _class, name)] == undefined) {
                        
                    /*    
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-loading-indicator', 
                            {source : 'metadata-{0}-{1}-{2}'
                                .format(provider, type, _class)}));
                    */
                   
                    this.proxy
                        .execute(
                            action, 
                            new mol.services.Callback(success, failure));
                } else {
                    if(this.displays['dash-metadata-{0}-{1}-{2}-{3}'
                        .format(provider, type, _class, name)]
                            .dialog("isOpen")) {
                        this.displays['dash-metadata-{0}-{1}-{2}-{3}'
                            .format(provider, type, _class, name)]
                                .dialog("moveToTop");
                    } else {
                        this.displays['dash-metadata-{0}-{1}-{2}-{3}'
                            .format(provider, type, _class, name)]
                                .dialog("open");
                    }
                }
            },

            addEventHandlers: function() {
                var self = this;

                /**
                 * Callback that toggles the metadata display visibility.
                 *
                 * @param event mol.bus.Event
                 */
                this.bus.addHandler(
                    'metadata-toggle',
                    function(event) {
                        var params = event.params;
                        if(params.layer) {
                            self.getLayerMetadata(params.layer);
                        } else if(params.provider && params.type) {
                            self.getDashboardMetadata(params);
                        } else if(params.type) {
                            self.getTypeMetadata(params);
                        }
                    }
                );
           }
        }
    );

    mol.map.metadata.MetadataDisplay = mol.mvp.View.extend(
        {
            init: function(results) {
                var self = this,
                    html = '<div id="dialog">',
                    dHtml;

               _.each(
                    results.response.rows[0],
                    function(val, key, list) {
                        dHtml = '<div class="metarow metakey-{0}">' + 
                                '   <div class="key">{1}</div>' + 
                                '   <div class="values"></div>' + 
                                '</div>';
                        
                        html+=dHtml
                                .format(
                                    key.replace(/ /g, '_'),
                                    key.replace(/_/g,' '));
                    }
                )

                html+='</div>';

                this._super(html);
                _.each(
                    results.response.rows,
                    function(col) {
                        _.each(
                            col,
                            function(val, key, list) {
                                if(val != null) {
                                    $(self).find(".metakey-{0} .values"
                                        .format(key.replace(/ /g, '_')))
                                            .append(
                                                $('<div class="val">{0}<div>'
                                                    .format(val)));
                                }
                                if($(self).find(".metakey-{0}"
                                    .format(key.replace(/ /g, '_')))
                                        .find(".val").length == 0 ) {
                                    $(self).find(".metakey-{0}"
                                        .format(key.replace(/ /g, '_')))
                                            .toggle(false);
                                } else {
                                    $(self).find(".metakey-{0}"
                                        .format(key.replace(/ /g, '_')))
                                            .toggle(true);
                                }
                            }
                        )
                    }
                );
                
                _.each(
                    self.displays,
                    function(dialog) {
                        $(dialog).toggle(false);
                    }
                );
                
                this.dialog(
                    {
                        autoOpen: true,
                        stack: true,
                        dialogClass: "mol-LayerMetadata"
                    }
                );
                
                //set first col widths
                $(this).find('.key')
                    .width(Math.max.apply(Math, $(self).find('.key')
                        .map(function(){ 
                                return $(this).width(); 
                             }).get()));
                             
                //set total width
                this.dialog(
                    "option",
                    "width",
                    Math.max.apply(
                        Math, 
                        $(self).find('.key').map(
                            function(){ 
                                return $(this).width(); 
                            }).get()) + 
                    Math.max.apply(
                        Math, 
                        $(self).find('.values').map(
                            function(){ 
                                return $(this).width() 
                            }).get())+150);
            }
        }
    );

};



