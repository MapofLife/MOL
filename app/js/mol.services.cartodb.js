mol.modules.services.cartodb = function(mol) {
    mol.services.cartodb = {};
    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function() {          
                this.jsonp_url = '' +
                    'http://d3dvrpov25vfw0.cloudfront.net/' +
                    'api/v2/sql?callback=?&q={0}';
            }
        }
    );
    mol.services.cartodb.TileApi = Class.extend(
        {
            init: function() {          
                this.host = '' +
                    'd3dvrpov25vfw0.cloudfront.net';
            }
        }
    );
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi();
    mol.services.cartodb.tileApi = new mol.services.cartodb.TileApi();
};
