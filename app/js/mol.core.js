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
            source = $.trim(layer.source.toLowerCase()).replace(/ /g, "_"),
            names = $.trim(layer.names).replace(/ /g, "_"),
            feature_count = $.trim(layer.feature_count).replace(/ /g, "_");
        return 'layer--{0}--{1}--{2}--{3}--{4}'.format(name, type, source, names, feature_count);
    };

    /**
     * @param id The layer id of the form "layer--{name}--{type}--{source}--{englishname}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('--'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " "),
            names = tokens[4].replace(/_/g, " "),
            feature_count = tokens[5].replace(/_/g, " ");

        name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
        source = source.toLowerCase();
        type = type.toLowerCase();

        return {
            id: id,
            name: name,
            type: type,
            source: source,
            names: names,
            feature_count: feature_count
        };
    };
};
