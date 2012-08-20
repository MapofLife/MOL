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
            type_title = $.trim(layer.type_title).replace(/,/g, "").replace(/ /g, "_"),
            source_title = $.trim(layer.source_title).replace(/,/g, "").replace(/ /g, "_"),
            names = $.trim(layer.names).replace(/'S/g, "'s").replace(/ /g, "_"),
            feature_count = $.trim(layer.feature_count).replace(/ /g, "_"),
            sourcetype =  $.trim(layer.sourcetype).replace(/ /g, "_"),
            _class = $.trim(layer._class).replace(/ /g, "_"),
            extent = $.trim(layer.extent).replace(/ /g, "_").replace(/{/g,'lsq').replace(/}/g,'rsq'); //replacing squiggly brackets with lsq and rsq to make the json DOM-id-friendly.
        return 'layer--{0}--{1}--{2}--{3}--{4}--{5}--{6}--{7}--{8}--{9}'.format(name, type, source, names, feature_count, type_title, source_title, sourcetype, _class, extent);
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
            feature_count = tokens[5].replace(/_/g, " "),
            type_title = tokens[6].replace(/_/g, " "),
            source_title = tokens[7].replace(/_/g, " "),
            sourcetype = tokens[8].replace(/_/g, " "),
            _class = tokens[9].replace(/_/g, " "),
            extent = tokens[10].replace(/_/g, " ").replace(/lsq/g,'{').replace(/rsq/g,'}'); //put brackets back in to json.

        name = name.charAt(0).toUpperCase()+name.slice(1).toLowerCase();
        source = source.toLowerCase();
        type = type.toLowerCase();
        _class = _class.toLowerCase();

        return {
            id: id,
            name: name,
            type: type,
            source: source,
            names: names,
            feature_count: feature_count,
            type_title: type_title,
            source_title: source_title,
            sourcetype: sourcetype,
            _class : _class,
            extent: extent
        };
    };
};
