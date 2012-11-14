--get_species_list(text, float, float, int)
-- Function to get a species list for a radius around a point.
-- Params:	
--	dataset_id: the dataset_id
--	longitude:	
--	latitude:	
--	radius: the search radius in meters
--	class: a class to filter 
-- Returns:
-- 	scientificname
--	commonname

DROP function get_species_list(text, numeric, numeric, int, text);
CREATE FUNCTION public.get_species_list(text, numeric, numeric, int, text)
	RETURNS TABLE(
		scientificname text, 
		thumbsrc text, 
		imgsrc text, 
		english text, 
		"order" text, 
		family text, 
		redlist text, 
		className text, 
		type_title text, 
		provider_title text, 
		type text, 
		provider text, 
		year_assessed text, 
		sequenceid float, 
		eol_page_id text
	) 
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  BEGIN
      --assemble some sql to get the tables we want. a a table was passed as a paramater, use that 
      
      sql = 'SELECT * from data_registry WHERE dataset_id = ''' || $1 || '''';
      FOR data in EXECUTE sql LOOP
         IF data.product_type = 'range' THEN
		sql = ('SELECT DISTINCT d.' ||  data.scientificname || ' as scientificname, ' ||
		'    CASE e.good WHEN true THEN e.eolthumbnailurl ELSE '''' END as thumbsrc, ' ||
	        '    CASE e.good WHEN true THEN e.eolmediaurl ELSE '''' END as imgsrc, ' ||
                '    t.common_names_eng as english, ' ||
                '    initcap(lower(t._order)) as order, ' ||
                '    initcap(lower(t.Family)) as family, ' ||
                '    t.red_list_status as redlist, ' ||
                '    initcap(lower(t.class)) as className, '||
                '    dt.title as type_title, ' ||
                '    pv.title as provider_title, ' ||
                '    dt.type as type, ' ||
                '    pv.provider as provider, ' ||
                '    t.year_assessed as year_assessed, ' ||
                '    s.sequenceid as sequenceid, ' ||
                '    page_id as eol_page_id ' ||
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
                '    (ST_PointFromText(''POINT(' || $2 ||' ' || $3||')'',4326),3857),' || $4 ||')' ||
		' ORDER BY s.sequenceid, d.' ||  data.scientificname ||' asc');
		RETURN QUERY EXECUTE sql;
        ELSIF data.product_type = 'regionalchecklist' THEN
		sql = ('SELECT DISTINCT ' ||  data.scientificname || ' as scientificname, ' ||
		'    CASE e.good WHEN true THEN e.eolthumbnailurl ELSE '''' END as thumbsrc, ' ||
	        '    CASE e.good WHEN true THEN e.eolmediaurl ELSE '''' END as imgsrc, ' ||
                '    tX.common_names_eng as english, ' ||
                '    initcap(lower(t.order_desc)) as order, ' ||
                '    initcap(lower(t.Family)) as family, ' ||
                '    tx.red_list_status as redlist, ' ||
                '    initcap(lower(t.class)) as className, '||
                '    dt.title as type_title, ' ||
                '    pv.title as provider_title, ' ||
                '    dt.type as type, ' ||
                '    pv.provider as provider, ' ||
                '    tx.year_assessed as year_assessed, ' ||
                '    s.sequenceid as sequenceid, ' ||
                '    page_id as eol_page_id ' ||
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
		' ORDER BY s.sequenceid, ' ||  data.scientificname ||' asc');
		RETURN QUERY EXECUTE sql;	
	ELSE
                -- We got nuttin'
	  END IF;
       END LOOP;
    END
$$  language plpgsql;
