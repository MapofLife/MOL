-- Function to get a summary of stats for the dashboard header
DROP function get_dashboard_summary();
CREATE FUNCTION get_dashboard_summary() 
	RETURNS TABLE(names int, providers int, datasets int, all_matches int, direct_matches int, syn_matches int, taxon_total int, records_total int) 
AS
$$
BEGIN
	RETURN QUERY
	SELECT 
		CAST((SELECT count(*) FROM ac LIMIT 1) as int) as names,
		CAST((SELECT count(*) FROM providers LIMIT 1) as int)  as providers,
		CAST((SELECT count(*) FROM data_registry LIMIT 1) as int)  as datasets,
		CAST((SELECT count(*) FROM ac LEFT JOIN synonyms s ON ac.n = s.scientificname JOIN taxonomy t ON (s.mol_scientificname = t.scientificname OR ac.n = t.scientificname) LIMIT 1) as int)  as all_matches,
		CAST((SELECT count(*) FROM ac JOIN taxonomy t ON ac.n = t.scientificname LIMIT 1) as int)  as direct_matches,		
        	CAST((SELECT count(*) FROM ac LEFT JOIN synonyms  s ON ac.n = s.scientificname JOIN taxonomy t ON (s.mol_scientificname = t.scientificname ) where  s.mol_scientificname <> s.scientificname LIMIT 1) as int)  as syn_matches,
		CAST((SELECT count(*) FROM taxonomy LIMIT 1) as int) as taxon_total,
        	CAST((SELECT SUM(feature_count) FROM dash_cache LIMIT 1) as int) as records_total;	

END
$$  language plpgsql;
