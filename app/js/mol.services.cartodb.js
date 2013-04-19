mol.modules.services.cartodb = function(mol) {
    mol.services.cartodb = {};
    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function() {
                this.jsonp_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
//                    'http://mol.cartodb.com/' +
                    'api/v2/sql?mol_cache=041920131653&callback=?&q={0}';
                this.json_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
//                    'http://mol.cartodb.com/' +
                    'api/v2/sql?mol_cache=041920131653&q={0}';
                //cache key is mmddyyyyhhmm
                this.sql_cache_key = '041920131653';
            }
        }
    );
    mol.services.cartodb.TileApi = Class.extend(
        {
            init: function() {
                this.host = '' +
//                    'mol.cartodb.com';
                    'd3dvrpov25vfw0.cloudfront.net';
                //cache key is mmddyyyyhhmm of cache start
                this.tile_cache_key = '041920131653';
            }
        }
    );
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi();
    mol.services.cartodb.tileApi = new mol.services.cartodb.TileApi();
};
