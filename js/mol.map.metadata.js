mol.modules.map.metadata = function(mol) {

    mol.map.metadata = {};

    mol.map.metadata.MetadataEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
            this.sql = {
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
                    '   dm.Recommended_citation as "Recommended Citation", ' +
                    '   dm.Contact as "Contact" ' +
                    'FROM dashboard_metadata dm ' +
                    'WHERE ' +
                    '   dm.dataset_id = \'{0}\'',
                types: '' +
                    'SELECT title as "Data Type", description AS "Description" FROM types where type = \'{0}\''
            }
       },

        start: function() {

            this.addEventHandlers();
        },
        getTypeMetadata:function (params) {
            var self = this,
                type = params.type,
                title = params.title,
                sql = this.sql['types'].format(type);
              this.getMetadata(sql, title);
        },
        getDashboardMetadata: function (params) {
            var self = this,
                dataset_id = params.dataset_id,
                title = params.title,
                sql = this.sql['dashboard'].format(dataset_id);
            this.getMetadata(sql, title);
        },
        getMetadata: function (sql, title) {
            this.bus.fireEvent(
                new mol.bus.Event(
                    'show-loading-indicator',
                    {source: sql}
                )
            );
            $.getJSON(
                mol.services.cartodb.sqlApi.json_url.format(sql),
                function(response) {
                    if(self.display) {
                        self.display.dialog('close');
                    }
                    if(!response.error) {
                        if(response.total_rows > 0) {
                            self.display =
                                new mol.map.metadata.MetadataDisplay(
                                    response, title
                                );
                        }
                    }
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-loading-indicator',
                            {source: sql}
                        )
                    );
                }
            );
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
                    if(params.dataset_id) {
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
        init: function(response, title) {
            var self = this,
                html = '' +
                    '<div id="dialog" title="{0}">'.format(title),
                row_html = '' +
                    '<div class="metarow metakey-{0}">' +
                        '<div class="key">{1}</div>' +
                        '<div class="values"></div>' +
                    '</div>';
           _.each(
                response.rows[0],
                function(val, key, list) {
                    html+=row_html.format(
                            key.replace(/ /g, '_'),
                            key.replace(/_/g,' ')
                        );
                }
            )

            html+='</div>';

            this._super(html);
            _.each(
                response.rows,
                function(col) {
                    _.each(
                        col,
                        function(val, key, list) {
                            if(val != null) {
                                $(self).find(".metakey-{0} .values"
                                    .format(key.replace(/ /g, '_')))
                                    .append($('<div class="val">{0}<div>'
                                    .format(val)));
                            }
                            if($(self).find(".metakey-{0}"
                                .format(key.replace(/ /g, '_')))
                                .find(".val").length == 0 ) {
                                $(self).find(".metakey-{0}".format(
                                    key.replace(/ /g, '_'))
                                ).toggle(false);
                            } else {
                                $(self).find(".metakey-{0}"
                                    .format(key.replace(/ /g, '_')))
                                    .toggle(true);
                            }
                        }
                    )
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
                .width(
                    Math.max.apply(
                        Math,
                        $(self)
                            .find('.key')
                                .map(
                                    function(){
                                        return $(this).width();
                                    }
                                ).get()));
            //set total width
            this.dialog(
                "option",
                "width",
                Math.max.apply(
                    Math,
                    $(self).find('.key')
                        .map(
                            function(){
                                return $(this).width();
                            }
                        ).get())+
                    Math.max.apply(
                        Math,
                        $(self).find('.values').map(
                            function(){
                                return $(this).width()
                            }
                        ).get())+150
            );

            this.dialog("moveToTop");
        }
    });

};



