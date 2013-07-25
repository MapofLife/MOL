/**
 * This module provides core functions.
 */
mol.modules.core = function(mol) {

    mol.core = {};

    /**
     * Returns a layer id string given a layer {name, type, source, englishname}.
     */
    mol.core.getLayerId = function(layer) {
        var //name = $.trim(layer.name.toLowerCase()).replace(/ /g, "_").replace(/(.)/),
            name = this.encode(layer.name),
            type = this.encode(layer.type),
            source = this.encode(layer.source),
            source_type = this.encode(layer.source_type),
            dataset_id = this.encode(layer.dataset_id);

        return 'layer--{0}--{1}--{2}--{3}--{4}'.format(name, type, source, dataset_id, source_type);
    };
    /*
     * Makes a string safe for use as a DOM id or class name.
     */
    mol.core.encode = function(string) {
        return (escape(string)).replace(/%/g,'222').replace(/\./g,'333').replace(/\//g, '444');
    };
    /*
     * Decodes string encoded with mol.core.encode. 
     */
    mol.core.decode = function(string) {
        return (unescape(string.replace(/222/g,'%').replace(/333/g,'.').replace(/444/g, '/')));
    };
    
}
