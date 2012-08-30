/**
 * This module provides core functions.
 */
mol.modules.core = function(mol) {

    mol.core = {};

    /**
     * Retunrs a layer id string given a layer {name, type, source, englishname}.
     */
    mol.core.getLayerId = function(layer) {
        var name = $.trim(layer.name.toLowerCase()).replace(/ /g, "_"),
            type = $.trim(layer.type.toLowerCase()).replace(/ /g, "_"),
            source = $.trim(layer.source.toLowerCase()).replace(/,/g, "").replace(/ /g, "_"),
            data_table = $.trim(layer.data_table).replace(/,/g, "").replace(/ /g, "_");

        return 'layer--{0}--{1}--{2}--{3}'.format(name, type, source, data_table);
    };
}