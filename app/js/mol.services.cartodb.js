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
    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi();
};