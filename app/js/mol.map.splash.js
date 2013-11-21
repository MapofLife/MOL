mol.modules.map.splash = function(mol) {

    mol.map.splash = {};

    mol.map.splash.SplashEngine = mol.mvp.Engine.extend({
        init: function(proxy, bus, map) {
            this.proxy = proxy;
            this.bus = bus;
            this.map = map;
            this.IE8 = false;
        },
        start: function() {
            this.display = new mol.map.splash.splashDisplay();
            this.addEventHandlers();
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
                width: $(window).width() > 778  ? 778 : $(window).width() - 30,
                height: $(window).width() > 535  ? 535 : $(window).width() - 30,
                DialogClass: "mol-splash",
                title: "Map of Life",
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
            //old ie8, please upgrade
            this.IE8 = true;
            this.display.iframe_content.src = '/static/splash/ie8.html';
            this.initDialog();
            this.display.mesg.append($("<div class='IEwarning'>Your version of Internet Explorer requires the Google Chrome Frame Plugin to view the Map of Life. Chrome Frame is available at <a href='http://www.google.com/chromeframe'>http://www.google.com/chromeframe/</a>. Otherwise, please use the latest version of Chrome, Safari, Firefox, or Internet Explorer.</div>"));
            $(this.display).dialog("option", "closeOnEscape", false);
            $(this.display).bind(
            "dialogbeforeclose",
            function(event, ui) {
                alert('Your version of Internet Explorer is not supported. Please install Google Chrome Frame, or use the latest version of Chrome, Safari, Firefox, or IE.');
                return false;
            }
            );
            $(self.display.iframe_content).height(320);
        },
        /*
        * Display a message if the site is down.
        */
        molDown: function() {
            this.initDialog();
            this.display.mesg.append($("<font color='red'>Map of Life is down for maintenance. We will be back up shortly.</font>"));
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
            this.display.dashboard.click(
                function(event) {
                    self.bus.fireEvent(
                        new mol.bus.Event(
                            'taxonomy-dashboard-toggle',
                            {visible: true}
                        )
                    );
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
                if (self.getIEVersion() < 9 && self.getIEVersion() >= 0) {
                    self.badBrowser();
                } else if (self.MOL_Down) {
                    self.molDown();
                } else {
                    self.initDialog();
                }
            });
        }
    });
    mol.map.splash.splashDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
            '<div class="mol-Splash">' +
                '<div class="message"></div>' +
                '<div class="header">' +
                    '<div style="font-size:16px; margin-bottom:6px;">' +
                        'Map of Life is an online resource for mapping, ' +
                        'monitoring and analyzing biodiversity worldwide. ' +
                        'Welcome to this demo version!' +
                    '</div>' +
                '</div>' +
                '<div class="mainPanel">' +
                    '<span class="legend">Map a species</span>' +
                    '<div class="innerPanel">' +
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
                                            'class="speciesPic mapSingleLayer" ' +
                                            'data-name="Phoeniconaias minor" ' +
                                            'src="../static/img/flamingo25x37px.png" />' +
                                    '</div>' +
                                '</div>' + 
                                '<div class="iconTop">' +
                                    '<div style="width:38px; height:39px;">' +
                                        '<img title="Broad-Banded Grass Frog" ' +
                                        'class="speciesPic mapSingleLayer" ' +
                                        'data-name="Ptychadena bibroni" ' +
                                        'src="../static/img/frog38x39px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconTop">' +
                                    '<div style="width:40px; height:38px;">' +
                                        '<img title="Joshua Tree" ' +
                                        'class="speciesPic mapSingleLayer" ' +
                                        'data-name="Yucca brevifolia" ' +
                                        'src="../static/img/jtree40x38px.png" />' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom">' +
                                    '<div style="width:60px; height:27px;">' +
                                        '<img ' +
                                            'title="Hairy-Eared Dwarf Lemur" ' +
                                            'class="speciesPic mapSingleLayer" ' +
                                            'data-name="Allocebus trichotis" ' +
                                            'src="../static/img/lemur60x27px.png"/>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="iconBottom" style="float:right">' +
                                    '<div style="width:50px; height:33px;">'+
                                        '<img ' +
                                            'title="Arabian Toad-headed Agama" ' +
                                            'class="speciesPic mapSingleLayer" ' +
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
            '</div>' +
            '<div class="spacer"></div>' +
            '<div class="mainPanel">' +       
                '<span class="legend">See a species list</span>' +
                '<div class="innerPanel">' +
                    '<div class="imagePanel">' +
                        '<img src="../static/img/species-list150px.jpg"/>' +
                    '</div>' +
                    '<div class="buttonPanel">' + 
                        '<span class="mol-Splash button liveNear">' +
                            'Which birds live near me?' +
                        '</span>' +
                        '<div style="font-weight:normal; margin-top:10px; margin-bottom: 20px height:90px"">' +
                            '<div >What lives near me?</div>'  +
                            '<div style="margin-top:10px; width:150px">' +
                                '<div class="iconTop">' +
                                    '<div style="width:29px; height:40px;">' +
                                        '<img title="Birds" class="speciesPic liveNear"  data-dataset_id="jetz_maps" data-class_name="Aves" src="../static/img/bird29x40px.png" /></div></div>' +
                                    '<div class="iconTop"><div style="width:38px; height:39px;">' +
            '                           <img title="Amphibians" ' +
                                            'class="speciesPic liveNear" '+
                                            'data-dataset-id="iucn_amphibians" '+
                                            'data-class-name="Amphibia" '+
                                            'src="../static/img/frog38x39px.png" />'+
                                        '</div>'+
                                    '</div>' +
            '                       <div class="iconTop"><div style="width:40px; height:18px; margin-top:11px">'+
            '                           <img title="Freshwater Fishes"  class="speciesPic liveNear" data-dataset-id="na_fish" data-class-name="Fishes" src="../static/img/bass40x18px.png" /></div></div>' +
            '                       <div  class="iconBottom"><div style="width:60px; height:27px;">' +
            '                           <img title="Mammals" class="speciesPic liveNear" data-dataset-id="iucn_mammals" data-class-name="Mammalia" src="../static/img/lemur60x27px.png"/></div></div>' +
            '                       <div class="iconBottom" style="float:right"><div style="width:50px; height:33px;">' +
            '                           <img title="Reptiles" class="speciesPic liveNear" data-dataset-id="iucn_reptiles" data-class-name="Reptilia" src="../static/img/lizard50x33px.png"/></div></div>' +
            '                   </div>' +
            '               </div>' +
                            '<div style="clear:both; padding-top:7px";><span  class="mol-Splash button list">Let me pick a place</span></div>'   + //
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="bottomPanel">' +
                    '<span class="mol-Splash dashboard button">' +
                        'All datasets' +
                    '</span>' +
                    '<div class="spacer"></div>'+
                    '<span class="mol-Splash about button">' +
                        'About' +
                    '</span>' + 
                '</div>' +
                
            '<div id="footer_imgs" style="text-align: center;clear: both;">' + '<div>Sponsors, partners and supporters</div>' +
                    '<a target="_blank" tabindex="-1" href="http://www.yale.edu/jetz/"><button><img width="72px" height="36px" title="Jetz Lab, Yale University" src="/static/home/yale.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://sites.google.com/site/robgur/"><button><img width="149px" height="36px" title="Guralnick Lab, University of Colorado Boulder" src="/static/home/cuboulder.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.gbif.org/"><button><img width="33px" height="32px" title="Global Biodiversity Information Facility" src="/static/home/gbif.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.eol.org/"><button><img width="51px" height="32px" title="Encyclopedia of Life" src="http://www.mappinglife.org/static/home/eol.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.nasa.gov/"><button><img width="37px" height="32px" title="National Aeronautics and Space Administration" src="http://www.mappinglife.org/static/home/nasa.png"></button></a>' +
                    '<br>' +
                    '<a target="_blank" tabindex="-1" href="http://www.nceas.ucsb.edu/"><button><img width="30px" height="32px" title="National Center for Ecological Analysis and Synthesis" src="http://www.mappinglife.org/static/home/nceas.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.iplantcollaborative.org/"><button><img width="105px" height="32px" title="iPlant Collaborative" src="http://www.mappinglife.org/static/home/iplant.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.senckenberg.de"><button><img width="81px" height="32px"title="Senckenberg" src="http://www.mappinglife.org/static/home/senckenberg.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.bik-f.de/"><button><img width="74px" height="32px" title="Biodiversität und Klima Forschungszentrum (BiK-F)" src="http://www.mappinglife.org/static/home/bik_bildzeichen.png"></button></a>' +
                    '<a target="_blank" tabindex="-1" href="http://www.mountainbiodiversity.org/"><button><img width="59px" height="32px" title="Global Mountain Biodiversity Assessment" src="http://www.mappinglife.org/static/home/gmba.png"></button></a>' +
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