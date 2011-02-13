"""The application's Globals object"""

class Globals(object):

    """Globals acts as a container for objects available throughout the
    life of the application
    """
    
    

    def __init__(self):
        """One instance of Globals is created during application
        initialization and is available during requests via the
        'app_globals' variable

        """
        self.TILE_DIR = '/ftp/tile'
        self.NEW_SHP_SCAN_DIR = '/ftp/new/animalia/species'
        self.TILE_DIR = "/ftp/tile/animalia/species"
        self.ERR_DIR = "/ftp/error/"
        self.SRC_DIR = "/ftp/new/"
        self.DST_DIR = "/ftp/archive/"
        self.MAP_XML = "/ftp/tile/mapfile.xml"
        self.GAE_URL = "http://localhost:8080/"
        #self.GAE_URL = "http://sandbox.latest.mol-lab.appspot.com/"        
        self.VALID_ID_SERVICE_URL = "%slayers" % self.GAE_URL
        self.LAYER_URL = "%slayers" % self.GAE_URL
        self.TILE_URL = '/api/tiles/animalia/species/%s/zoom/x/y.png'
        #self.TILE_URL = '/api/tiles/animalia/species/%s/zoom/x/y.png'
        
        
        self.NEW_RASTER_JOB_TYPE = 'newraster'
        self.NEW_SHP_JOB_TYPE = 'newshp'
        self.BULKLOAD_TILES_JOB_TYPE = 'bulkload-tiles'
        self.Q_ITEM_FULL_PATH = 'fullpath'
        self.Q_ITEM_JOB_TYPE = 'jobtype'
