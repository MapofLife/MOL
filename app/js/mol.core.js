/**
 * This module provides core functions. 
 */
mol.modules.core = function(mol) { 
    
    mol.core = {};
    
    /**
     * Retunrs a layer id string given a layer name, type, and source.
     */
    mol.core.getLayerId = function(name, type, source) {
        return 'layer-{0}-{1}-{2}'.format(name, type, source);
    };
    
    /**
     * @param id The layer id of the form "layer-{name}-{type}-{source}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('-'),
            name = tokens[1],
            type = tokens[2],
            source = tokens[3];
        
        return {
            id: id,
            name: name,
            type: type,
            souce: source
        };
    };
};
