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
        /*
        *  Method to attach MOL events to links in the iframe.
        */
        addIframeHandlers: function() {
            var self = this;

            $(this.display.iframe_content[0].contentDocument.body).find('.getspecies').click(function(event) {
                $(self.display).dialog('option', 'modal', 'false');
                $(self.display.parent()).animate({
                    left: '{0}px'.format($(window).width() / (7 / 4) - 400)
                }, 'slow');
                self.bus.fireEvent(new mol.bus.Event('search', {
                    term: 'Puma concolor'
                }));
                setTimeout(function() {
                    self.bus.fireEvent(new mol.bus.Event('results-select-all'))
                }, 1000);
                setTimeout(function() {
                    self.bus.fireEvent(new mol.bus.Event('results-map-selected'))
                }, 2000);
            });
            $(this.display.iframe_content[0].contentDocument.body).find('.listdemo1').click(function(event) {
                $(self.display).dialog('option', 'modal', 'false');
                $(self.display.parent()).animate({
                    left: '{0}px'.format($(window).width() / 3 - 400)
                }, 'slow');
                self.bus.fireEvent(new mol.bus.Event('layer-display-toggle', {
                    visible: false
                }));
                self.bus.fireEvent(new mol.bus.Event('species-list-query-click', {
                    gmaps_event: {
                        latLng: new google.maps.LatLng(-2.263, 39.045)
                    },
                    map: self.map
                }));
            });
        },
        initDialog: function() {
            var self = this;
            this.display.dialog({
                autoOpen: true,
                width: 800,
                height: 580,
                DialogClass: "mol-splash",
            //modal: true
            });
            $(this.display).width('98%');
            $(".ui-widget-overlay").live("click", function() {
                self.display.dialog("close");
            });
            this.map.setCenter(new google.maps.LatLng(0,-50));
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
            this.bus.addHandler(
            'toggle-splash',
            function(event) {
                if (self.getIEVersion() < 9 && self.getIEVersion() >= 0) {
                    self.badBrowser();
                } else if (self.MOL_Down) {
                    self.molDown();
                } else {
                    self.initDialog();
                }
                if (!self.IE8) {
                    $(self.display.iframe_content).load(function(event) {
                        self.addIframeHandlers();
                    });
                }
            });
        }
    });
    mol.map.splash.splashDisplay = mol.mvp.View.extend({
        init: function() {
            var html = '' +
            '<div class="mol-Splash">' +
            '    <div class="message"></div>' +
            '    <iframe class="mol-splash iframe_content ui-dialog-content" style="height:400px; width: 98%; margin-left: -18px; margin-right: auto; display: block;" src="/static/splash/index.html"></iframe>' +
            '    <div id="footer_imgs" style="text-align: center">' + '<div>Sponsors, partners and supporters</div>' +
            '        <a target="_blank" tabindex="-1" href="http://www.yale.edu/jetz/"><button><img width="72px" height="36px" title="Jetz Lab, Yale University" src="/static/home/yale.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://sites.google.com/site/robgur/"><button><img width="149px" height="36px" title="Guralnick Lab, University of Colorado Boulder" src="/static/home/cuboulder.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.gbif.org/"><button><img width="33px" height="32px" title="Global Biodiversity Information Facility" src="/static/home/gbif.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.eol.org/"><button><img width="51px" height="32px" title="Encyclopedia of Life" src="http://www.mappinglife.org/static/home/eol.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.nasa.gov/"><button><img width="37px" height="32px" title="National Aeronautics and Space Administration" src="http://www.mappinglife.org/static/home/nasa.png"></button></a>' +
            '        <br>' +
            '        <a target="_blank" tabindex="-1" href="http://www.nceas.ucsb.edu/"><button><img width="30px" height="32px" title="National Center for Ecological Analysis and Synthesis" src="http://www.mappinglife.org/static/home/nceas.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.iplantcollaborative.org/"><button><img width="105px" height="32px" title="iPlant Collaborative" src="http://www.mappinglife.org/static/home/iplant.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.nsf.gov/"><button><img width="32px" height="32px" title="National Science Foundation" src="http://www.mappinglife.org/static/home/nsf.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.senckenberg.de"><button><img width="81px" height="32px"title="Senckenberg" src="http://www.mappinglife.org/static/home/senckenberg.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.bik-f.de/"><button><img width="74px" height="32px" title="Biodiversität und Klima Forschungszentrum (BiK-F)" src="http://www.mappinglife.org/static/home/bik_bildzeichen.png"></button></a>' +
            '        <a target="_blank" tabindex="-1" href="http://www.mountainbiodiversity.org/"><button><img width="59px" height="32px" title="Global Mountain Biodiversity Assessment" src="http://www.mappinglife.org/static/home/gmba.png"></button></a>' +
            '    </div>' +
            '</div>';
            this._super(html);
            this.iframe_content = $(this).find('.iframe_content');
            this.mesg = $(this).find('.message');
        }
    });
};