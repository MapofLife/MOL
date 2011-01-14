import sys, logging, os, shutil, datetime, time, shlex, subprocess
import StringIO

class Layer():
    zoom = 12 #sets the maximum zoom we want to process
    info = {}
    errors = []
    nulfp= StringIO.StringIO()
    projected = False
    converted = False
    tiled = False
    
    def __init__(self, dirname=None,filename=None):
        """raster: string filename of file to process"""
        if filename is not None:
            self.origRaster = "%s/%s" % (dirname,filename)
            self.id = filename.split('.')[0]
            self.verifyId()
            self.getInfo()
            self.tileFolder = "/some/tmp/folder/for/tiles/" + self.id
            self.ascName = "/some/tmp/folder/for/%s.asc" % self.id
            self.tifName = "/some/tmp/folder/for/%s.tif" % self.id
            
        
    def verifyId(self):
        """check to see that the id exists on GAE"""
        return True
    
    def getInfo(self):
        #use gdalinfo to populate an info object
        info = subprocess.Popen(
            ["gdalinfo",
             self.origRaster
            ], stdout=subprocess.PIPE).communicate()[0].split("\n")
        self.info["id"] = self.id
        self.info["zoom"] = {}
        self.info["box"] = {}
        
        self.info["zoom"]["min"] = 0
        self.info["zoom"]["max"] = self.zoom
        
        upper = info[7].split()
        lower = info[10].split()
        self.info["box"]["xmin"] = upper[3].replace(",",""))
        self.info["box"]["xmax"] = lower[3].replace(",",""))
        self.info["box"]["ymax"] = upper[3].replace(",","")).replace(")",""))
        self.info["box"]["ymin"] = lower[3].replace(",","")).replace(")",""))
        
        #should grab projection info here also
        
        return True
        
    def projectToGMAP(self):
        #should add steps to check that the projection isn't already 90013
        if self.projected:
            return True
        else:
            self.projecting = subprocess.Popen(
                ["gdalwarp",
                 "-of",
                 "GTiff",
                 "-t_srs",
                 "epsg:900913",
                 self.origRaster,
                 self.tifName
                ], stderr= self.nulfp)
            self.projected = True
            return True
        
    def convertToASC(self):
        if not self.projected:
            self.projectToGMAP()
        
        try:
            self.projecting.wait()
        except:
            pass
            
        if self.converted:
            return True
        else:
            self.converting = subprocess.Popen(
                ["gdal_translate",
                 "-of",
                 "AAIGrid",
                 self.tifName,
                 self.ascName)
                ], stderr=self.nulfp)
            self.converted = True
            return true
            
    def tile(self):
        if not self.converted:
            self.convertToASC()
            
        try:
            self.converting.wait()
        except:
            pass
            
        self.tiling = subprocess.Popen(
            ["java",
            "-mx300m",
            "-classpath",
            "/tiler/classes:/tiler/lib/maxent.jar",
            "-Djava.awt.headless=true",
            "raster/GridToGoogle",
            self.ascName,
            self.tileFolder,
            str(self.zoom+1)
            ], stderr=self.nulfp)
        
        
if __name__ == "__main__":
    #run the code
    dirName = str(sys.argv[1])
    fileName = str(sys.argv[2])
    Layer(dirname=dirname,filename=filename)
    Layer.tile()
