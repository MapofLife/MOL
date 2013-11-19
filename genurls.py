import urllib, sys
if __name__ == '__main__':
    host = "http://mol.cartodb.com/api/v2/sql?q="
    query = "SELECT DISTINCT p.scientificname as scientificname, t.common_names_eng as english, initcap(lower(t._order)) as order, initcap(lower(t.Family)) as family, t.red_list_status as redlist, initcap(lower(t.class)) as className, dt.title as type_title, pv.title as provider_title, dt.type as type, pv.provider as provider, t.year_assessed as year_assessed, s.sequenceid as sequenceid FROM polygons p LEFT JOIN synonym_metadata n ON p.scientificname = n.scientificname LEFT JOIN (SELECT scientificname, replace(initcap(string_agg(common_names_eng, ',')),'''S','''s') as common_names_eng, MIN(class) as class, MIN(_order) as _order, MIN(family) as family, string_agg(red_list_status,' ') as red_list_status, string_agg(year_assessed,' ') as year_assessed FROM master_taxonomy GROUP BY scientificname ) t ON (p.scientificname = t.scientificname OR n.mol_scientificname = t.scientificname) LEFT JOIN sequence_metadata s ON t.family = s.family LEFT JOIN types dt ON p.type = dt.type LEFT JOIN providers pv ON p.provider = pv.provider WHERE ST_DWithin(p.the_geom_webmercator,ST_Transform(ST_PointFromText('POINT(%s.1234567 %s.1234567)',4326),3857),50000) AND p.class='aves' AND p.type='range' ORDER BY s.sequenceid, p.scientificname asc"
    out = open('urls.txt', 'w')
    count = 256
    for x in range(-170, 170, 10):
        for y in range(-80, 80, 5):
            q = query % (x, y)
            out.write('%s%s\n' % (host, urllib.quote(q)))
            if count == 0:
                out.close()
                sys.exit(1)
            count -= 1
