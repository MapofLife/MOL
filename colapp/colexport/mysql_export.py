import MySQLdb, re
import simplejson as sj

conn = MySQLdb.connect (host = "localhost",
                       port = 3306,
                       user = "username",
                       passwd = "password",
                       db = "col2010ac")
specind = open("colexport/specind.csv","w+")

def cs(val,lower=1,quote=1): #clean the string from some weird junk in some of the fields
    if val==None:
        return "NULL"
    if lower==1:
        val = val.replace('"','').replace("\n","").replace("'","''").strip("'").strip().lower()
    else:
        val = val.replace('"','').replace("\n","").replace("'","''").strip("'").strip()
    if quote==1:
        return "'" + val + "'"
    return val
def run():
    specind.write("record_id\tkey\tname_code\tcol_lsid\tdatabase_full_name\trank\tname\tkingdom\tphylum\tclassx\torderx\tfamily\tsuperfamily\tgenus\tspecies\tinfraspecies\tauthor\tnameslist\tnamesjson\tclassification\tauthorityName\tauthority\n")
    
    cursor = conn.cursor ()
    cursor.execute ("CREATE TEMPORARY TABLE spec (record_id INT, keyx TEXT, name_code TEXT, col_lsid TEXT, database_full_name TEXT, rank TEXT, name TEXT, kingdom TEXT, phylum TEXT, classx TEXT, orderx TEXT, family TEXT, superfamily TEXT, genus TEXT, species TEXT, infraspecies TEXT, author TEXT);")
    cursor.execute ("SELECT s.record_id,lsid,taxon,kingdom,phylum,class,f.order,family,superfamily,genus,species, infraspecies, author,database_full_name,s.name_code FROM scientific_names s,taxa t, `databases` d,families f WHERE s.is_accepted_name = 1 AND f.is_accepted_name=1 AND s.database_id = d.record_id AND s.family_id = f.record_id AND t.record_id = s.record_id AND t.is_accepted_name = 1 AND upper(kingdom) = 'ANIMALIA' AND species = 'gracilis' ORDER BY genus;")
    data = cursor.fetchall()
    for r in data:
        #pattern = u'[^\.a-z -]'
        if r[11] is None or len(r[11].strip())==0:
            key = "'animalia/%s/%s_%s'" % (cs(r[2],1,0), cs(r[9],1,0),cs(r[10],1,0))
        else:
            key = "'animalia/%s/%s_%s_%s'" % (cs(r[2],1,0), cs(r[9],1,0),cs(r[10],1,0),cs(r[11],1,0))
        #if re.search(pattern, row[2].lower()):                                               
        sql = 'INSERT INTO spec (record_id, col_lsid, rank, kingdom, phylum, classx, orderx, family, superfamily, genus, species, infraspecies, author, database_full_name,name_code,keyx) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);' % (r[0], cs(r[1]), cs(r[2]), cs(r[3]), cs(r[4]), cs(r[5]), cs(r[6]), cs(r[7]), cs(r[8]), cs(r[9]), cs(r[10]), cs(r[11]), cs(r[12],0), cs(r[13],0), cs(r[14],0), key)
        #print sql
        cursor.execute(sql)
    print "table made"
    cursor.execute ("SELECT * FROM spec;")
    data = cursor.fetchall ()
    for r in data:
        names = []
        namesdicts = []
        cursor.execute ('SELECT c.common_name,c.language FROM common_names c WHERE name_code = "%s";' % r[2])
        cn = cursor.fetchall ()
        for n in cn:
            names.append(cs(n[0],1,0))
            namesdicts.append({
                "name":cs(n[0],0,0),
                "language":cs(n[1],0,0),
                "type":"common name",
                "author": None,
                "source": "COL",
                })
        cursor.execute ('SELECT s.genus,s.species,s.infraspecies,s.is_accepted_name,author FROM scientific_names s where accepted_name_code = "%s";' % r[2])
        sn = cursor.fetchall ()
        for n in sn:
            if n[2] is None or len(n[2])==0:
                nm = "%s %s" % (cs(n[0],1,0),cs(n[1],1,0))
                nmu = "%s %s" % (cs(n[0],0,0),cs(n[1],0,0))
            else:
                nm = "%s %s %s" % (cs(n[0],1,0),cs(n[1],1,0),cs(n[2],1,0))
                nmu = "%s %s %s" % (cs(n[0],0,0),cs(n[1],0,0),cs(n[2],0,0))
            names.append(nm)
            nd = {"name":nmu,"language":"latin","author":n[4]}
            if n[3] == 1:
                nd["type"]="accepted name"
            else:
                nd["type"]="scientific name"
            nd["source"] = "COL"
            namesdicts.append(nd)
        for i in r:
            specind.write('%s' % i)
            specind.write("\t")    
        taxonomy = {
                "kingdom": r[7],
                "phylum": r[8],
                "class": r[9],
                "order": r[10],
                "family": r[11],
                "superfamily": r[12], 
                "genus": r[13], 
                "species": r[14],
                "infraspecies": None,
                "author": r[16]}
        if r[15] is not None:
            taxonomy["infraspecies"] = r[15]
        authority = {"authority": "COL",
                     "database": r[4],
                     "external identifier": r[3]
                     }
        cmma = ""
        for i in names:
            specind.write(i)
            specind.write(cmma)
            cmma = ","
        specind.write("\t")
        specind.write(u'%s' % namesdicts)
        specind.write("\t")
        specind.write(u'%s' % taxonomy)
        specind.write("\t")
        specind.write(u'%s' % authority)
        specind.write("\t")
        specind.write(u'COL')
        specind.write("\n")
    cursor.close ()
    
    

if __name__ == "__main__":
    run()
