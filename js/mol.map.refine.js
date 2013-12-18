mol.modules.map.refine = function(mol) {
    mol.map.refine = {};

    mol.map.refine.RefineEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus) {
            this.proxy = proxy;
            this.bus = bus;
        },

        start: function() {
            this.display = new mol.map.refine.RefineDisplay();
            this.addEventHandlers();
        },

        addEventHandlers: function() {
            var self = this;

            this.bus.addHandler(
                'show-refine',
                function(event) {
                    self.displayRefine(
                        event.params.target,
                        event.params.layer);

                }
            );
            this.bus.addHandler(
                'update-refine-stats',
                function(event) {
                    self.refine_stats.find('.{0}'.format(event.stat))
                        .html('<div>{0}</div>'.format(event.content));
                }
            );
            
        },
        displayRefine: function(button, layer) {
            var baseHtml,
                params = {
                    layer: layer
                },
                q,
                self = this;

            baseHtml = '' +
                   '<div class="mol-LayerControl-Styler">' +
                        '<div class="habitats"></div>' +
                        '<br>' +
                        '<div>Choose source:' +
                            '<select class="mode">' +
                                '<option value="modis">MODIS MCD12Q1 V005</option>' +
                                '<option value="consensus">Consensus land cover</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="modis_year">Habitat from ' +
                            '<div>Choose Year' +
                                '<select class="year">' +
                                    '<option value="2001">2001</option>' +
                                    '<option value="2002">2002</option>' +
                                    '<option value="2003">2003</option>' +
                                    '<option value="2004">2004</option>' +
                                    '<option value="2005">2005</option>' +
                                    '<option value="2006">2006</option>' +
                                    '<option value="2007">2007</option>' +
                                 '</select>' +
                            '</div>' +
                        '</div>' +
                        '<div class="elevLabel">' +
                            'Elevation Range:<br>0m-10000m' +
                        '</div>' +
                        '<div class="elev"></div>' +
                        '<div class="buttonWrapper">' +
                            '<button class="apply">Apply</button>' +
                            '<button class="reset">Reset</button>' +
                            '<button class="cancel">Cancel</button>' +
                       '</div>'+
                       '<div class="refine_stats">' +
                           '<div class="range_size"></div>' +
                           '<div class="refined_size"></div>' +
                           '<div class="point_assessment"></div>' +
                       '</div>' +
                   '</div>';

            $(button).removeData('qtip');

            q = $(button).qtip({
                content: {
                    text: baseHtml,
                    title: {
                        text: 'Habitat Preferences',
                        button: false
                    }
                },
                position: {
                    at: 'left center',
                    my: 'right top'
                },
                show: {
                    event: 'click',
                    delay: 0,
                    ready: true,
                    solo: true
                },
                hide: false,
                style: {
                    def: false,
                    classes: 'ui-tooltip-widgettheme'
                },
                events: {
                    render: function(event, api) {
                        self.setHabitatProperties(
                                    api.elements.content,
                                    layer,
                                    false);
                        
                        self.refine_stats = $(api.elements.content)
                            .find('.refine_stats');
                        
                        $(api.elements.content).find('.apply').click(
                            function(event) {
                                var params = {
                                    layer: layer
                                };
                                params.layer.mode = 'ee';
                                params.layer.filter_mode =  $(api.elements.content).find('.mode').val();
                                self.bus.fireEvent(
                                    new mol.bus.Event('toggle-ee-filter',  params)
                                );
                            }
                        );

                        $(api.elements.content).find('.mode').change(
                            function(event) {
                                if($(this).val()=='modis') {
                                    $(api.elements.content).find('.modis_year')
                                        .show();
                                } else {
                                    $(api.elements.content).find('.modis_year')
                                        .hide();
                                }
                                self.setHabitatProperties(
                                    api.elements.content,
                                    layer,
                                    false);
                            }
                        );

                        $(api.elements.content)
                            .find('.reset').click(
                                function(event) {
                                    self.setHabitatProperties(
                                                    api.elements.content,
                                                    layer,
                                                    true);
                                }
                            );

                        $(api.elements.content)
                            .find('.cancel').click(
                                function(event) {
                                    $(button).prop('disabled', false);
                                    $(button).qtip('destroy');
                                }
                            );
                    },
                    show: function(event, api) {
                        $(button).prop('disabled', true);
                    }
                }
            });
            
        },
        setHabitatProperties: function(cont, layer,  reset) {
            var maxe, mine,
                mode = $(cont).find('.mode').val(),
                habitats= {
                    'modis' : {
                        1:'Evergreen Needleleaf Forests',
                        2:'Evergreen Broadleaf Forests',
                        3:'Deciduous Needleleaf Forests',
                        4:'Deciduous Broadleaf Forests',
                        5:'Mixed Forests',
                        6:'Closed Shrublands',
                        7:'Open Shrublands',
                        8:'Woody Savannas',
                        9:'Savannas',
                        10:'Grasslands',
                        11:'Permanent Wetlands',
                        12:'Cropland',
                        13:'Urban and Built-up',
                        14:'Cropland/Natural Vegetation Mosaics',
                        15:'Snow and Ice Barren',
                        16:'Barren',
                        17:'Water Bodies'},
                    'consensus' : {
                        1: 'Evergreen/deciduous needleleaf trees',
                        2: 'Evergreen broadleaf trees',
                        3: 'Deciduous broadleaf trees',
                        4: 'Mixed/other trees',
                        5: 'Shrubs',
                        6: 'Herbaceous vegetation',
                        7: 'Cultivated and managed vegetation',
                        8: 'Regularly flooded shrub/herbaceous vegetation',
                        9: 'Urban/built-up',
                        10: 'Snow/ice',
                        11: 'Barren lands/sparse vegetation',
                        12: 'Open water'
                    }
                },
                selectedHabitats ={
                    'modis': new Array(),
                    'consensus': new Array()
                },
                self = this;
                //TODO make this more general ... probably going to have
                // many different habitats pref types in future
                //if no modis habitat prefs, then select all.
                if(reset && (layer.modis_habitats == null)) {
                    selectedHabitats['modis'] = _.keys(habitats['modis']);
                } else if(reset || layer.selectedHabitats == undefined && layer.modis_habitats != null) {
                    selectedHabitats['modis'] = layer.modis_habitats.split(',');
                } else if(layer["selectedHabitats"]){
                    selectedHabitats['modis'] = layer.selectedHabitats['modis'];
                } else {
                    selectedHabitats['modis'] = _.keys(habitats['modis']);
                }

                //if no consensus prefs, then select all.
                if(reset && (layer.consensus_habitats == null)) {
                    selectedHabitats['consensus'] = _.keys(habitats['consensus']);
                } else if(reset || layer.selectedHabitats == undefined && layer.consensus_habitats != null) {
                    selectedHabitats['consensus'] = layer.consensus_habitats.split(',');
                } else if(layer["selectedHabitats"]){
                    selectedHabitats['consensus'] = layer.selectedHabitats['consensus'];
                } else {
                    selectedHabitats['consensus'] = _.keys(habitats['consensus']);
                }

                //attach habitat selection to the layer object
                layer.selectedHabitats = selectedHabitats;

                //if no elev prefs, then select all.
                if(reset && (layer.mine == null || layer.maxe == null)) {
                    selectedElev = [-500,9000];
                } else if(reset || layer.selectedElev == undefined && (layer.mine != null || layer.maxe != null) ) {
                    selectedElev = [layer.mine,layer.maxe];
                } else if(layer["selectedElev"]){
                    selectedElev = layer.selectedElev;
                } else {
                    selectedElev = [-500,9000];
                }
                layer.selectedElev = selectedElev;

                //Get the MODIS year.
                if(reset) {
                    selectedYear = '2001';
                } else if(layer["selectedYear"]){
                    selectedYear = layer.selectedYear;
                } else {
                    selectedYear = '2001';
                }
                layer.selectedYear = selectedYear;
                
                //add the habitats
                 $(cont).find('.habitats').empty();
                _.each(
                    habitats[mode],
                    function(habitat, habitat_code) {
                        var html = '' +
                            '<div class="habitat {0}" ' +
                                'data-habitat="{1}">{2}</div>',
                            display = $(html.format(
                                (_.indexOf(layer.selectedHabitats[mode],habitat_code)>=0) ?
                                    'selected' : '',
                                habitat_code,
                                habitat)
                            );
                        display.click(
                            function(event) {
                                if($(this).hasClass('selected')) {
                                    $(this).removeClass('selected');
                                    layer.selectedHabitats[mode] =
                                        _.without(
                                            layer.selectedHabitats[mode],
                                            [$(this).data('habitat').toString()]
                                        );
                                } else {
                                    $(this).addClass('selected');
                                    layer.selectedHabitats[mode].push(
                                        $(this).data('habitat').toString()
                                    );
                                }
                            }
                        );
                        $(cont).find('.habitats').append(display);
                    }.bind(layer)
                );

                //get elevation range
                $(cont).find('.elev').slider({
                    range: true,
                    min:-500,
                    max:9000,
                    values:layer.selectedElev,
                    slide: function(event, ui) {
                        $(cont).find('.elevLabel').html(
                            'Elevation Range:<br>{0}m-{1}m'.format(ui.values[0],ui.values[1])
                        );
                        layer.selectedElev=ui.values;
                    }.bind(layer)
                    }
                );

                $(cont).find('.elevLabel').html(
                    'Elevation Range:<br>{0}m-{1}m'.format(layer.selectedElev[0],layer.selectedElev[1])
                );

                $(cont).find('.year').val(selectedYear);
                $(cont).find('.year').change(
                    function(event) {
                        layer.selectedYear = $(this).val();
                    }
                );
            }
        }
    );
    mol.map.refine.RefineDisplay = mol.mvp.View.extend({
        init: function(refine) {
            var html = '' +
                       '<div>All the above qtip code needs to go here</div>',
                self = this;

            this._super(html);
        }
    });
};
