/*
 * jQuery UI Autocomplete RegExp Extension
 *
 */
(function( $ ) {

var autocomplete = $.ui.autocomplete;

var _initSource = autocomplete.prototype._initSource;
autocomplete.prototype._initSource = function() {
    var source = this.options.source;
    if ( $.isArray(source) ) {
        this.source = function( request, response ) {
            var matchstr = autocomplete.escapeRegex( request.term );
            if (typeof this.options.RegEx == 'string') {
                   if (this.options.RegEx.indexOf('<term>') > 0) {
                       matchstr = this.options.RegEx.replace(/<term>/g, autocomplete.escapeRegex( request.term ));

                   }
            }
            var matcher = new RegExp( matchstr, "i" );
            response( $.grep( source, function( value ) {
                value = value.label || value.value || value;
                return matcher.test( value );
            }) );
        };
    } else {
        return _initSource.call( this );
    }
};

})( jQuery );