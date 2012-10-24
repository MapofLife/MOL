-- Function to get all MOL layers (checklist and polygon), cache this result in layers_metadata
DROP function get_dashboard_metadata();
CREATE FUNCTION get_dashboard_metadata() 
	RETURNS TABLE(provider text, type text, provider_id text, type_id text, classes text, dataset_title text, dataset_id text, species_count bigint, feature_count  bigint, pct_in_tax int) 

	
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE provider RECORD;
  DECLARE type RECORD; 
  BEGIN
      FOR data in (SELECT * from data_registry) LOOP
	 SELECT * INTO type FROM types t where t.type = data.product_type LIMIT 1;
	 SELECT * INTO provider FROM providers p where p.provider = data.provider LIMIT 1;
         IF ((data.type = 'range' or data.type = 'points'))  THEN
                sql = 'SELECT ' || 
                  '   TEXT(''' || REPLACE(provider.title,'''','''''') || ''') as provider, ' ||
	          '   TEXT(''' || REPLACE(type.title,'''','''''') || ''') as type, ' ||
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.type || ''') as type_id, ' ||
		  '   TEXT(''' || data.classes || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title,'''','''''') || ''') as dataset, ' ||
		  '   TEXT(''' || data.dataset_id || ''') as dataset_id, ' ||
                  '   count(DISTINCT '|| data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count, ' ||
		  CASE  WHEN data.auto_tax THEN ' 100 as pct_in_tax ' ELSE 
 	          '   (select CAST(100*CAST(( ' || 
		  '      SELECT count(distinct d.' || data.scientificname || ') from ' || data.table_name || ' d ' ||
      		  '      LEFT JOIN  synonyms s ON d.'|| data.scientificname || ' = s.scientificname ' ||
		  '      JOIN  taxonomy t ON (d.'|| data.scientificname || ' = t.scientificname OR s.mol_scientificname = t.scientificname) ' ||
		  '   ) as float)/CAST((SELECT count(distinct '|| data.scientificname || ') from ' || data.table_name ||') as float) as int)) as pct_in_tax '
	          END || 
		  'FROM ' || data.table_name; 
         ELSIF  data.type = 'taxogeochecklist'  THEN 
		sql = ' SELECT ' || 
                  '   TEXT(''' || REPLACE(provider.title,'''','''''') || ''') as provider, ' ||
	          '   TEXT(''' || REPLACE(type.title,'''','''''') || ''') as type, ' ||
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.type || ''') as type_id, ' ||
		  '   TEXT(''' || data.classes || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title,'''','''''') || ''') as dataset, ' ||
		  '   TEXT(''' || data.dataset_id || ''') as dataset_id, ' ||
                  '   count(DISTINCT ' || data.species_id || ') as species_count, ' ||
                  '   count(*) as feature_count, ' ||
		  CASE  WHEN data.auto_tax THEN ' 100 as pct_in_tax ' ELSE 
		  '   (select CAST(100*CAST(( ' || 
		  '      SELECT count(distinct d.' || data.species_id || ') from ' || data.table_name || ' d ' ||
		  '	 LEFT JOIN '|| data.taxo_table||' t ON d.'|| data.species_id || '= t.' || data.species_link_id  ||
      		  '      LEFT JOIN  synonyms s ON '|| data.scientificname || ' = s.scientificname ' ||
		  '      JOIN  taxonomy tx ON ('|| data.scientificname || ' = tx.scientificname OR s.mol_scientificname = tx.scientificname) ' ||
		  '   ) as float)/CAST((SELECT count(distinct '|| data.species_id || ') from ' || data.table_name ||') as float) as int)) as pct_in_tax ' 
		  END || ' FROM ' || data.table_name || ' d';
	 ELSIF data.type = 'geochecklist'  THEN 		
		sql = ' SELECT ' || 
                  '   TEXT(''' || REPLACE(provider.title,'''','''''') || ''') as provider, ' ||
	          '   TEXT(''' || REPLACE(type.title,'''','''''') || ''') as type, ' ||
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.type || ''') as type_id, ' ||
		  '   TEXT(''' || data.classes || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title,'''','''''') || ''') as dataset, ' ||
		  '   TEXT(''' || data.dataset_id || ''') as dataset_id, ' ||
                  '   count(DISTINCT ' || data.scientificname || ') as species_count, ' ||
                  '   count(*) as feature_count, ' ||
		  CASE  WHEN data.auto_tax  THEN ' 100 as pct_in_tax ' ELSE 
		  '   (select CAST(100*CAST(( ' || 
		  '      SELECT count(distinct ' || data.scientificname || ') from ' || data.table_name || ' d ' ||
		  '      LEFT JOIN  synonyms s ON ' || data.scientificname || ' = s.scientificname ' ||
		  '      JOIN  taxonomy tx ON ('|| data.scientificname || ' = tx.scientificname OR s.mol_scientificname = tx.scientificname) ' ||
		  '   ) as float)/CAST((SELECT count(distinct '|| data.scientificname || ') from ' || data.table_name ||' d) as float) as int)) as pct_in_tax ' 
		  END || ' FROM ' || data.table_name || ' d';
	ELSIF data.type = 'taxogeooccchecklist' THEN 			
		sql = ' SELECT ' || 
                  '   TEXT(''' || REPLACE(provider.title,'''','''''') || ''') as provider, ' ||
	          '   TEXT(''' || REPLACE(type.title,'''','''''') || ''') as type, ' ||
		  '   TEXT(''' || provider.provider || ''') as provider_id, ' ||
	          '   TEXT(''' || type.type || ''') as type_id, ' ||
		  '   TEXT(''' || data.classes || ''') as classes, ' ||
                  '   TEXT(''' || REPLACE(data.dataset_title,'''','''''') || ''') as dataset, ' ||
		  '   TEXT(''' || data.dataset_id || ''') as dataset_id, ' ||
                  '  (SELECT count(*) FROM ' || data.taxo_table || ') as species_count, ' ||
                  '   count(*) as feature_count, ' ||
		  CASE  data.auto_tax WHEN true THEN ' 100 as pct_in_tax ' ELSE
		  '   (select CAST(100*CAST(( ' || 
		  '      SELECT count(distinct t.' || data.scientificname || ') from ' || data.taxo_table || ' t ' ||
		  '      LEFT JOIN  synonyms s ON t.' || data.scientificname || ' = s.scientificname ' ||
		  '      JOIN  taxonomy tx ON (t.'|| data.scientificname || ' = tx.scientificname OR s.mol_scientificname = tx.scientificname) ' ||
		  '   ) as float)/CAST((SELECT count(distinct '|| data.scientificname || ') from ' || data.taxo_table ||') as float) as int)) as pct_in_tax ' 
		  END || ' FROM ' || data.occurrence_table || ' d ';
	  ELSE
                -- We got nuttin'
	  END IF;
	  IF sql is not Null and TRIM(sql) <> '' THEN
			RETURN QUERY EXECUTE sql;
		END IF;
       END LOOP;
    END
$$  language plpgsql;
