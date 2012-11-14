--get_species_list(text, float, float, int)
-- Function to get species list data for a CSV download.
-- Params:	
--	dataset_id: the dataset_id
--	longitude:	
--	latitude:	
--	radius: the search radius in meters
--	class: a class to filter 
-- Returns:
-- 	scientificname
--	commonname

DROP function get_species_list_csv(text, numeric, numeric, int, text);
CREATE FUNCTION get_species_list_csv(text, numeric, numeric, int, text)
	RETURNS TABLE(
		"Scientific Name" text, 
		"Common Name (English)" text, 
		"Order" text, 
		"Family" text, 
		"IUCN Red List Status" text, 
		"Class" text, 
		"Type" text, 
		"Source" text, 
		"Year Assessed" text, 
		"Sequence ID" float 
	) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      sql = 'SELECT * from data_registry WHERE dataset_id = ''' || $1 || '''';
      FOR data in EXECUTE sql LOOP
         IF data.product_type = 'range' THEN
		sql = (' ' ||
		' SELECT DISTINCT d.' ||  data.scientificname || ' as "Scientific Name", ' ||
		'    t.common_names_eng as "Common Name (English)", ' ||
                '    initcap(lower(t._order)) as "Order", ' ||
                '    initcap(lower(t.Family)) as "Family", ' ||
                '    t.red_list_status as "IUCN Red List Status", ' ||
                '    initcap(lower(t.class)) as "Class", '||
                '    dt.title as "Type", ' ||
                '    pv.title as "Source", ' ||
                '    t.year_assessed as "Year Assessed", ' ||
                '    s.sequenceid as "Sequence ID" ' ||
		' FROM ' ||  data.table_name || ' d ' ||
		' LEFT JOIN eol e ON d.' || data.scientificname || ' = e.scientificname ' ||  
		' LEFT JOIN synonym_metadata n ' ||
                '    ON d.' ||  data.scientificname || ' = n.scientificname ' ||
                ' LEFT JOIN taxonomy t ' ||
                '    ON (d.' ||  data.scientificname || ' = t.scientificname OR ' ||
                '        n.mol_scientificname = t.scientificname) ' ||
		' LEFT JOIN sequence_metadata s ' ||
                '    ON t.family = s.family ' ||
                ' LEFT JOIN types dt ON ' ||
                '    '''||data.product_type|| ''' = dt.type ' ||
                ' LEFT JOIN providers pv ON ' ||
                '    '''||data.provider|| ''' = pv.provider ' ||		
		' WHERE ST_DWithin(d.the_geom_webmercator,ST_Transform' ||
                '    (ST_PointFromText(''POINT(' || $2 ||' ' || $3||')'',4326),3857),' || $4 || ')' ||
		' ORDER BY s.sequenceid, d.' ||  data.scientificname ||' asc');
		RETURN QUERY EXECUTE sql;
        ELSIF data.product_type = 'regionalchecklist' THEN
		sql = (' ' ||
		' SELECT DISTINCT ' ||  data.scientificname || ' as "Scientific Name", ' ||
                '    tx.common_names_eng as "Common Name (English)", ' ||
                '    initcap(lower(t.order_desc)) as "Order", ' ||
                '    initcap(lower(t.Family)) as "Family", ' ||
                '    tx.red_list_status as "IUCN Red List Status", ' ||
                '    initcap(lower(t.class)) as "Class", '||
                '    dt.title as "Type", ' ||
                '    pv.title as "Source", ' ||
                '    tx.year_assessed as "Year Assessed", ' ||
                '    s.sequenceid as "Sequence ID" ' ||
		' FROM ' ||  data.table_name || ' d ' ||
		' LEFT JOIN ' || data.geom_table || ' g ON d.' || data.geom_id || ' = g.' || data.geom_link_id || 
		' LEFT JOIN ' || data.taxo_table || ' t ON d.' || data.species_id || ' = t.' || data.species_link_id ||
 		' LEFT JOIN eol e ON ' || data.scientificname || ' = e.scientificname ' ||  
		' LEFT JOIN synonym_metadata n ' ||
                '    ON ' ||  data.scientificname || ' = n.scientificname ' ||
                ' LEFT JOIN taxonomy tx ' ||
                '    ON (' ||  data.scientificname || ' = tx.scientificname OR ' ||
                '        n.mol_scientificname = tx.scientificname) ' ||
		' LEFT JOIN sequence_metadata s ' ||
                '    ON t.family = s.family ' ||
                ' LEFT JOIN types dt ON ' ||
                '    ''' || data.product_type || ''' = dt.type ' ||
                ' LEFT JOIN providers pv ON ' ||
                '    ''' || data.provider || ''' = pv.provider ' ||		
		' WHERE t.class = '''|| $5 ||''' AND ST_DWithin(g.the_geom_webmercator,ST_Transform' ||
                '    (ST_PointFromText(''POINT(' || $2 ||' ' || $3 || ')'',4326),3857),' || $4 ||')' ||
		' ORDER BY s.sequenceid, ' ||  data.scientificname || ' asc');
		RETURN QUERY EXECUTE sql;	
	ELSE
                -- We got nuttin'
	  END IF;
       END LOOP;
    END
$$  language plpgsql;
