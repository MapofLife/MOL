mol.modules.services.cartodb = function(mol) {
    mol.services.cartodb = {};
    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function() {
                this.jsonp_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
                    'api/v2/sql?callback=?&q={0}';
                this.json_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
                    'api/v2/sql?q={0}';
                //cache key is mmddyyyyhhmm
                this.sql_cache_key = '120420121435';
            }
        }
    );
    mol.services.cartodb.TileApi = Class.extend(
        {
            init: function() {
                this.host = '' +
                    'd3dvrpov25vfw0.cloudfront.net';
                //cache key is mmddyyyyhhmm of cache start
                this.tile_cache_key = '121220121553';
            }
        }
    );
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi();
    mol.services.cartodb.tileApi = new mol.services.cartodb.TileApi();
};
