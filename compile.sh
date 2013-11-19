#!/bin/sh

cd js

rm -rf ../static/js/mol.js

cat mol.js mol.core.js mol.bus.js mol.mvp.js mol.services.js mol.services.cartodb.js mol.map.js mol.map.refine.js mol.map.loading.js mol.map.layers.js mol.map.menu.js mol.map.results.js mol.map.search.js mol.map.tiles.js mol.map.dashboard.js mol.map.feature.js mol.map.query.js mol.map.basemap.js mol.map.metadata.js mol.map.splash.js mol.map.help.js mol.map.status.js mol.map.styler.js mol.map.images.js mol.map.boot.js > ../static/js/mol.js

cd ..
