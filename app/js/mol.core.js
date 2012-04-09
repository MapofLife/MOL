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
            source = $.trim(layer.source.toLowerCase()).replace(/ /g, "_");
            englishname = $.trim(layer.englishname).replace(/ /g, "_");
            records = $.trim(layer.records).replace(/ /g, "_");
        return 'layer--{0}--{1}--{2}--{3}--{4}'.format(name, type, source, englishname, records);
    };

    /**
     * @param id The layer id of the form "layer--{name}--{type}--{source}--{englishname}".
     */
    mol.core.getLayerFromId = function(id) {
        var tokens = id.split('--'),
            name = tokens[1].replace(/_/g, " "),
            type = tokens[2].replace(/_/g, " "),
            source = tokens[3].replace(/_/g, " ");
            englishname = tokens[4].replace(/_/g, " ");
            records = tokens[5].replace(/_/g, " ");

        name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
        source = source.toLowerCase();
        type = type.toLowerCase();

        return {
            id: id,
            name: name,
            type: type,
            source: source,
            englishname: englishname,
            records: records
        };
    };
};
