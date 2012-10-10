mol.modules.services.cartodb = function(mol) {

    mol.services.cartodb = {};

    mol.services.cartodb.SqlApi = Class.extend(
        {
            init: function(user, host) {
                this.user = user;
                this.host = host;
                this.url = 'https://{0}.{1}/api/v2/sql';
                this.cache = '/cache/get';
            },

            query: function(key, sql, callback) {
                var data, xhr;

                if(key) {
                    data = {key:key, sql:sql};
                    xhr = $.post(this.cache, data);
                } else {
                    data = {q:sql}
                    xhr = $.post(this.url.format(this.user,this.host), data );
                }


                xhr.success(
                    function(response) {
                        callback.success(response);
                    }
                );

                xhr.error(
                    function(response) {
                        callback.failure(response);
                    }
                );
            }
        }
    );

    mol.services.cartodb.sqlApi = new mol.services.cartodb.SqlApi(
        'mol', 'cartodb.com');

    mol.services.cartodb.query = function(key, sql, callback) {
        mol.services.cartodb.sqlApi.query(key, sql, callback);
    };

};