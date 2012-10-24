-- Function to add names to the taxonomy from accepted sources
DROP function update_taxonomy();
CREATE FUNCTION update_taxonomy() 
	RETURNS TABLE(sql text)
AS
$$
  DECLARE sql TEXT;
  DECLARE data RECORD; -- a data table record
  DECLARE provider RECORD;
  DECLARE type RECORD; 
  BEGIN
      FOR data in (SELECT * from data_registry where auto_tax = true) LOOP
         IF ((data.type = 'range' or data.type = 'points'))  THEN
                sql = 'INSERT INTO taxonomy (scientificname, auto_tax) 
			select DISTINCT d.' || data.scientificname || ', true from ' || data.table_name ||' d left join taxonomy tx ON d.' || data.scientificname || ' = tx.scientificname where tx.scientificname is null;'; 
         ELSIF  data.type = 'taxogeochecklist'  THEN 
		sql = 'INSERT INTO taxonomy (scientificname, auto_tax) 
			select DISTINCT ' || data.scientificname || ', true from ' || data.taxo_table ||' t left join taxonomy tx ON '|| data.scientificname ||' = tx.scientificname where t.scientificname is null;'; 
	 ELSIF data.type = 'geochecklist'  THEN 		
		sql = 'INSERT INTO taxonomy (scientificname, auto_tax) 
			select DISTINCT ' || data.scientificname || ', true from ' || data.table_name ||' d left join taxonomy tx ON ' || data.scientificname || ' = tx.scientificname where tx.scientificname is null;';
	ELSIF data.type = 'taxogeooccchecklist' THEN 			
	     sql = 'INSERT INTO taxonomy (scientificname, auto_tax) 
			select d.' || data.scientificname || ', true from ' || data.taxo_table ||' d left join taxonomy tx ON d.' || data.scientificname || ' = tx.scientificname where tx.scientificname is null;';
	  ELSE
                -- We got nuttin'
	  END IF;
	  IF sql is not Null and TRIM(sql) <> '' THEN
			RETURN QUERY SELECT sql;
		END IF;
       END LOOP;
    END
$$  language plpgsql;
