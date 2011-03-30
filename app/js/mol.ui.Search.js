/**
 * Search module has a display used as a map control. It allows users to search
 * for layers to add to the map.
 */
MOL.modules.Search = function(mol) {
    
    mol.ui.Search = {};

    /**
     * The search engine.
     */
    mol.ui.Search.Engine = mol.ui.Engine.extend(
        {
            /**
             * Constructs the engine.
             * 
             * @constructor
             */
            init: function(api, bus) {
                this._api = api;
                this._bus = bus;
            },

            /**
             * Starts the engine by creating and binding the display.
             *
             * @override mol.ui.Engine.start
             */
            start: function(container) {
                this._bindDisplay(new mol.ui.Search.Display({}));
            },

            /**
             * Gives the engine a new place to go based on a browser history
             * change.
             * 
             * @override mol.ui.Engine.go
             */
            go: function(place) {
                mol.log.todo('Search.Engine.go()');
            },
             
            /**
             * Binds the display.
             */
            _bindDisplay: function(display) {                
                this._display = display;
                display.setEngine(this);

                display.hide();

                this._addLayerControlEventHandler();                

                // TODO: Set up handlers for DOM elements in the display.

                this._addDisplayToMap();
            },
            
            /**
             * Fires a MapControlEvent so that the display is attached to
             * the map as a control in the TOP_LEFT position.
             */
            _addDisplayToMap: function() {
                var MapControlEvent = mol.events.MapControlEvent,
                    div = this._display.getElement()[0],
                    position = google.maps.ControlPosition.TOP_CENTER,
                    action = 'add';
                bus.fireEvent(new MapControlEvent(div, position, action));     
            },

            /**
             * Adds an event handler for LayerControlEvent events so that a
             * 'add-click' action will show the search display as a control
             * on the map.
             */
            _addLayerControlEventHandler: function() {
                var display = this._display,
                    bus = this._bus,
                    LayerControlEvent = mol.events.LayerControlEvent;
                
                bus.addHandler(
                    LayerControlEvent.TYPE,
                    function(event) {
                        var action = event.getAction(),
                            displayNotVisible = !display.isVisible();               
                        
                        if (action === 'add-click' && displayNotVisible) {
                            display.show();
                        }
                    }
                );
            }
        }
    );
    
    /**
     * The search display.
     */
    mol.ui.Search.Display = mol.ui.Display.extend(
        {
            init: function(config) {
                this._super();
                this.setInnerHtml(this._html())
                this._config = config;
            },
            getRestartButtion: function(){
                return this.findChild('#restart');
            },
            getCloseButton: function(){
                return this.findChild('#cancelAll');
            },
            getSelectButton: function(){
                return this.findChild('.mol-LayerControl-DataType');
            }, 
            getTypeSelectBox: function(){
                return this.findChild('.searchSource');
            }, 
            getSearchBox: function(){
                return this.findChild('.searchValue');
            }, 
            getGoButton: function() {
                return this.findChild('.searchExecute');
            },
            getSearchWidget: function(){
                return this.findChild('.mol-LayerControl-Search');
            },
            getNextButton: function(){
                return this.findChild('.addAll');
            },
            getAddButton: function(){
                return this.findChild('.nextPage');
            },
            _html: function(){
                return  '<button id="restart">restart</button>' +
                        '<button id="cancelAll">close</button>' +' +
                        '<div class="mol-LayerControl-DataType widgetTheme">' +
                        '      <div class="selectLabel">Select</div>' +
                        '      <button class="rangeTypeSelect">Range Map</button>' +
                        '      <button class="pointsTypeSelect">Occ. Points</button>' +
                        '</div>' +
                        '<div class="mol-LayerControl-Search widgetTheme">' +
                        '  <select name="searchSource" class="searchSource">' +
                        '      <option value="MOL">MOL</option>' +
                        '  </select>' +
                        '  <input class="searchValue" type="text" />' +
                        '  <button class="searchExecute">Go</button>' +
                        '</div>' +
                        '<div class="mol-LayerControl-Loading widgetTheme">' +
                        '    <div><img src="/static/loading-small.gif" /></div> <div>Searching...</div>' +
                        '</div>' +
                        '<div class="mol-LayerControl-Results">' +
                        '  <ol class="searchResults">' +
                        '    <ul class="result widgetTheme">' +
                        '        <div class="resultName">Puma concolor <br/><div class="resultAuthor">(author)</div></div>' +
                        '        <div class="resultLink"><a href="/static/dead_link.html">more info</a></div>' +
                        '        <div class="buttonContainer"> ' +
                        '            <input type="checkbox" class="checkbox" /> ' +
                        '            <span class="customCheck"></span> ' +
                        '        </div> ' +
                        '    </ul>' +
                        '  </ol>' +
                        '  <div class="navigation">' +
                        '      <button class="addAll">Add</button>' +
                        '      <button class="nextPage">Next Page</button>' +
                        '  </div>' +
                        '</div>';
            }
        }
    );
};
