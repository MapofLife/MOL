mol.modules.map.splash = function(mol) {

    mol.map.splash = {};

    mol.map.splash.SplashEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.IE8 = false;
            this.mode = 'maps';
        },
        start: function() {
        	if (this.getIEVersion() < 9 && this.getIEVersion() >= 0) {
                this.badBrowser();
            } else if (this.MOL_Down) {
                this.molDown();
            } else {
	        	this.display = new mol.map.splash.splashDisplay();
	            this.addEventHandlers();
            }
        },
        /*
        *  Returns the version of Internet Explorer or a -1
        *  (indicating the use of another browser).
        */
        getIEVersion: function() {
            var rv = -1, ua, re;
            if (navigator.appName == 'Microsoft Internet Explorer') {
                ua = navigator.userAgent;
                re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null) {
                    rv = parseFloat(RegExp.$1);
                }
            }
            return rv;
        },
        initDialog: function() {
            var self = this;
            
            this.display.dialog({
                autoOpen: true,
                class: 'widgetTheme',
                width: $(window).width() > 415  ? 415 : $(window).width() - 30,
                height: $(window).height() > 285  ? 285 : $(window).height() - 30,
                DialogClass: "mol-splash",
                title: (self.mode == 'maps') ? "Map a species" : "See a species list.",
                close: function() {
                    self.bus.fireEvent(new mol.bus.Event('dialog-closed-click'));
                }
            //modal: true
            });
         
            $(".ui-widget-overlay").live("click", function() {
                self.display.dialog("close");
            });
        },
        /*
        *  Display a message for IE8- users.
        */
        badBrowser: function() {
        	var self = this,
        		IEwarn = 'Sorry, your version of Internet Explorer requires the ' +
                    'Google Chrome Frame Plugin to view the Map of Life.<br>' +
                    'Chrome Frame is available at ' +
                    '<a href="http://www.google.com/chromeframe">' + 
                    	'http://www.google.com/chromeframe/</a>' +
                   	'.</br>Otherwise, please use the latest version of Chrome, ' +
                   	'Safari, Firefox, or Internet Explorer.' +
                   	'<p><a href="/about/">Click here</a> to learn more about ' +
                   	'the Map of Life Project</p>';
            //old ie8, please upgrade
            this.IE8 = true;
            $('<div class="mol-Splash IEwarning">{0}</div>'.format(IEwarn)).dialog({
            	title: 'Welcome to the Map of Life',
            	width: $(window).width()-50,
            	height: $(window).height()-50
            });
        },
        /*
        * Display a message if the site is down.
        */
        molDown: function() {
            this.initDialog();
            this.display.mesg.append($("" +
                "<font color='red'>" +
                    "Map of Life is down for maintenance. We will be back up shortly." +
                "</font>"
            ));
            $(this.display).dialog("option", "closeOnEscape", false);
            $(this.display).bind(
            "dialogbeforeclose",
            function(event, ui) {
                return false;
            }
            );
        },
        addEventHandlers: function() {
            var self = this;
            
            //Handlers for links in the splash.
            
            this.display.liveNear.click(
                function(event) {
                    var params = {dataset_id: $(this).data("dataset-id"),
                    	className: $(this).data("class-name")};
                    self.bus.fireEvent(new mol.bus.Event('hide-search'));
                    self.bus.fireEvent(new mol.bus.Event('show-list'));
                    self.bus.fireEvent(new mol.bus.Event('show-menu-hint'));
                    self.bus.fireEvent(new mol.bus.Event('list-local',params));
                    self.display.dialog("close");
                }
            );
            
            this.display.mapSingleLayer.click(
                function(event) {
                    var params = {dataset_id: 'mol',
                                    name: $(this).data("name")}
                    self.bus.fireEvent(new mol.bus.Event('map-single-species',params));
                    self.display.dialog("close");
                    self.bus.fireEvent(new mol.bus.Event('show-menu-hint'));
                    self.bus.fireEvent(new mol.bus.Event('hide-list'));
                }
            );   
                     
            this.display.pickRandom.click(
                function(event) {
                    self.bus.fireEvent(new mol.bus.Event('list-random',{}));
                    self.display.dialog("close");
                }
            );
            this.display.click(
                function(event){
                    $(this).qtip("close");
                }
            )
            this.display.list.click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'species-list-tool-toggle',
                            {visible: true}
                        )
                    );
                     self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-list'
                        )
                    );  
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-display-toggle',
                            {visible: false}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-list-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-menu-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-search'
                        )
                    );      
                    self.display.dialog("close");
                }
            );

            
            this.display.search.click(
                function(event) {
                    self.display.dialog("close");
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'search-display-toggle',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-search'
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'species-list-tool-toggle',
                            {visible: false}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'hide-list'
                        )
                    );
                     self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-menu-hint',
                            {visible: true}
                        )
                    );
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'show-search-hint',
                            {visible: true}
                        )
                    );
                }
            );
            
            
            this.display.about.click(
                function(event) {
                    window.open('/about/');
                }
            );
            
            this.bus.addHandler(
            'toggle-splash',
            function(event) {
                self.bus.fireEvent(new mol.bus.Event('clear-lists'));
                $(self.display).find('.{0}'.format(event.mode)).show();
                self.mode = event.mode;
                self.initDialog();
                
            });
        }
    });
    mol.map.splash.splashDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
            '<div class="mol-Splash">' +
                    '<div class="innerPanel maps">' +
                        '<div class="imagePanel">' +
                            '<img src="../static/img/puma-range150px.jpg"/>' +
                        '</div>' +
                        '<div class="buttonPanel">' +
                            '<span ' +
                                'class="mol-Splash button mapSingleLayer" ' +
                                'data-name="Puma concolor">' +
                                'Where do Pumas live?' +
                            '</span>'    +
                            '<div class="middlePanel">' +
                                '<div >Where does this live?</div>'    +
                            '<div class="iconPanel">' +
                                '<div class="iconTop">' +
                                    '<div style="width:25px; height:37px;">' +
                                        '<img title="Lesser Flamingo" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Phoeniconaias minor" ' +
                                            'src="../static/img/flamingo25x37px.png" />' +
                                    '</div>' +
                                '</div>' + 
                                '<div class="iconTop">' +
                                    '<div style="width:38px; height:39px;">' +
                                        '<img title="Broad-Banded Grass Frog" ' +
                                        'class="mapSingleLayer speciesPic" ' +
                                        'data-name="Ptychadena bibroni" ' +
                                        'src="../static/img/frog38x39px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconTop">' +
                                    '<div style="width:40px; height:38px;">' +
                                        '<img title="Joshua Tree" ' +
                                        'class="mapSingleLayer speciesPic" ' +
                                        'data-name="Yucca brevifolia" ' +
                                        'src="../static/img/jtree40x38px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom">' +
                                    '<div style="width:60px; height:27px;">' +
                                        '<img ' +
                                            'title="Hairy-Eared Dwarf Lemur" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Allocebus trichotis" ' +
                                            'src="../static/img/lemur60x27px.png"/>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom" style="float:right">' +
                                    '<div style="width:50px; height:33px;">'+
                                        '<img ' +
                                            'title="Arabian Toad-headed Agama" ' +
                                            'class="mapSingleLayer speciesPic" ' +
                                            'data-name="Phrynocephalus arabicus" ' +
                                            'src="../static/img/lizard50x33px.png"/>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div style="clear:both; padding-top:7px">'+
                            '<span class="mol-Splash button search">' +
                                'Let me search for a species' +
                            '</span>' +
                        '</div>'   +
                    '</div>'+
                '</div>' +
                '<div class="innerPanel lists">' +
                    '<div class="imagePanel">' +
                        '<img src="../static/img/species-list150px.jpg"/>' +
                    '</div>' +
                    '<div class="buttonPanel">' + 
                        '<span class="mol-Splash button liveNear">' +
                            'Which birds live near me?' +
                        '</span>' +
                        '<div class="middlePanel">' +
                            '<div>What lives near me?</div>'  +
                            '<div style="margin-top:10px; width:150px">' +
                                '<div class="iconTop">' +
                                    '<div style="width:29px; height:40px;">' +
                                        '<img title="Birds" ' +
                                        'class="liveNear speciesPic"  ' +
                                        'data-dataset_id="jetz_maps" ' +
                                        'data-class_name="Aves" ' +
                                        'src="../static/img/bird29x40px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconTop">' +
                            		'<div style="width:38px; height:39px;">' +
                                    	'<img title="Amphibians" ' +
                                            'class="liveNear speciesPic" '+
                                            'data-dataset-id="iucn_amphibians" '+
                                            'data-class-name="Amphibia" '+
                                            'src="../static/img/frog38x39px.png" />'+
                                        '</div>'+
                                    '</div>' +
                                    '<div class="iconTop">'+
                                    	'<div style="width:40px; height:18px; margin-top:11px">'+
            								'<img title="North American Freshwater Fishes" ' +
            									'class="liveNear speciesPic" ' +
            									'data-dataset-id="na_fish" ' +
            									'data-class-name="Fishes" ' +
            									'src="../static/img/bass40x18px.png" />' +
    									'</div>' +
									'</div>' +
            						'<div  class="iconBottom">' +
            							'<div style="width:60px; height:27px;">' +
            								'<img title="Mammals" ' +
            									'class="liveNear speciesPic" ' + 
            									'data-dataset-id="iucn_mammals" ' + 
            									'data-class-name="Mammalia" ' + 
            									'src="../static/img/lemur60x27px.png"/>'+
    									'</div>' +
									'</div>' +
            						'<div class="iconBottom" style="float:right">' +
            						    '<div style="width:50px; height:33px;">' +
                                            '<img title="North American Reptiles" ' +
                                            	'class="liveNear speciesPic" ' +
                                            	'data-dataset-id="iucn_reptiles" ' +
                                            	'data-class-name="Reptilia" ' +
                                            	'src="../static/img/lizard50x33px.png"/>' +
                                    	'</div>' +
                                	'</div>' +
                                '</div>' +
                            '</div>' +
                            '<div style="clear:both; padding-top:7px";>' +
                                '<span  class="mol-Splash button list">' +
                                    'Let me pick a place' +
                                '</span>' +
                            '</div>' + 
                        '</div>' +
            '</div>';
            this._super(html);
            this.about = $(this).find('.about');
            this.search = $(this).find('.search');
            this.dashboard = (this).find('.dashboard');
            this.seePuma = $(this).find('.seePuma');
            this.liveNear = $(this).find('.liveNear');
            this.mapSingleLayer = $(this).find('.mapSingleLayer');
            this.pickRandom = $(this).find('.pickRandom');
            this.list = $(this).find('.list');
            this.mesg = $(this).find('.message');
        }
    });
};