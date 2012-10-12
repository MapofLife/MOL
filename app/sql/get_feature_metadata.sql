-- get_mol_metadata(text)
-- Function to feature metadata json a singlerecord.
-- Params:
--    dataset_id-cartodb_id: The dataset and cartodb_id	of a record within it.
-- Returns:
---   JSON object with name:value pairs to populate the metadata popup.

DROP function get_feature_metadata(text);
CREATE FUNCTION get_feature_metadata(text)
	RETURNS text
AS
$$
    DECLARE sql TEXT;
    DECLARE table_name TEXT;
    DECLARE cartodb_id INT;
    DECLARE metadata RECORD; -- a feature_metadata table record
    DECLARE data RECORD; -- a feature_metadata table record
    DECLARE taxo RECORD; -- a taxonomy table record
    DECLARE geom RECORD; -- a geometry table record
    DECLARE result RECORD; -- the metadata record
    -- contents of a SQL CONCAT() that creates the json for wax info windows
    DECLARE json_string text; 
    DECLARE metadata_records text[]; 
    DECLARE index int;
    BEGIN
        table_name = split_part($1,'-', 1);
        cartodb_id = CAST(split_part($1,'-', 2) as Int);
        sql = 'SELECT * from feature_metadata WHERE data_table = ''' || 
            table_name || ''' ORDER BY "order" asc';
        json_string = '';
        FOR metadata in EXECUTE sql LOOP
            IF json_string <> '' THEN
                json_string = json_string || ','','',';
            END IF;    
            json_string = CONCAT(
                json_string, '''"',
                metadata.title, 
                '":"'',',
                (CASE WHEN 
                    metadata.field is not null and metadata.field <> '' 
                THEN metadata.field || ',' 
                ELSE ''''',' 
                END),
                '''"'''
            );  
        END LOOP;
        sql = 'SELECT * from data_registry WHERE table_name = ''' || 
            table_name || ''' LIMIT 1';
        EXECUTE sql INTO data;
        sql = '';
        IF data.type = 'range' or data.type = 'points' THEN              
            -- regular data table
            sql = 'SELECT CONCAT(''{'',' || json_string || 
                ',''}'') as feature_metadata FROM ' || data.table_name || 
                ' WHERE cartodb_id = ' || cartodb_id;   
        ELSIF data.type = 'taxogeooccchecklist' THEN        
            -- GBIF!
            sql = 'SELECT CONCAT(''{'',' || json_string || 
                ',''}'') as feature_metadata ' ||
                'FROM ' || data.table_name || ' d ' ||
                'JOIN ' || data.taxo_table || ' t ON ' ||
                '   d.' || data.species_id || ' = t.' || 
                    data.species_link_id || ' ' ||
                'JOIN ' || data.geom_table || ' g ON ' ||
                '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
                'JOIN ' || data.occurrence_table || ' o ON ' ||
                '   d.' || data.geom_id || ' = o.' || data.occurrence_geom_id ||
                ' WHERE d.cartodb_id = ' || cartodb_id;   
        ELSIF data.type = 'ecoregion' or data.type = 'taxogeochecklist' THEN 
            -- Checklist with a seperate geometry table and taxonomy table
            sql = 'SELECT CONCAT(''{'',' || json_string || 
                ',''}'') as feature_metadata ' ||
                ' FROM ' || data.table_name || ' d ' ||
                ' JOIN ' || data.taxo_table || ' t ON ' ||
                '   d.' || data.species_id || ' = t.' || data.species_link_id ||
                ' JOIN ' || data.geom_table || ' g ON ' ||
                '   d.' || data.geom_id || ' = g.' || data.geom_link_id  ||
                ' WHERE d.cartodb_id = ' || cartodb_id; 
        ELSIF data.type = 'protectedarea' or data.type = 'geochecklist' THEN 
            -- Checklist with a seperate geometry table but no taxonomy table
            sql = 'SELECT CONCAT(''{'',' || json_string || 
                ',''}'') as feature_metadata ' ||
                'FROM ' || data.table_name || ' d ' ||
                'JOIN ' || data.geom_table || ' g ON ' || 
                '   d.' || data.geom_id || ' = g.' || 
                    data.geom_link_id  || ' ' ||
                'where d.cartodb_id = ' || cartodb_id; 
        ELSE
            --nada
        END IF; 
       
        EXECUTE sql INTO result;
        RETURN TEXT(result.feature_metadata);
    END
$$  language plpgsql;

