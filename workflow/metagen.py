#!/usr/bin/env python
#
# Copyright 2011 Aaron Steele
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

"""This module generates various code that is based on source/DBF fields."""

import copy
import csv
import glob
import logging
from optparse import OptionParser
import os
import simplejson
import shlex
import subprocess
import sys
import yaml

SOURCE_FIELDS_CSV = 'MOLSourceFields.csv'
DBF_FIELDS_CSV = 'MOLSourceDBFfields.csv'

def _getoptions():
    ''' Parses command line options and returns them.'''
    parser = OptionParser()
    parser.add_option('--config_file', 
                      type='string', 
                      dest='config_file',
                      metavar='FILE', 
                      help='Bulkload YAML config file.')    
    parser.add_option('--url', 
                      type='string', 
                      dest='url',
                      help='URL endpoint to /remote_api to bulkload to.')                          
    return parser.parse_args()[0]

class Row(object):
    """Models a row in the CSV file."""
    @classmethod    
    def required(cls, row):
        return row['Required'] == 'y'
    @classmethod    
    def indexed(cls, row):
        return row['Indexed'] == 'y'
    @classmethod    
    def fieldname(cls, row):
        val = row['FieldName']
        if val: 
            val = val.lower().strip()
        return val

class Dbf(Row):
    """A row from the DBF fields CSV file."""
    pass

class Source(Row):
    """A row from the source fields CSV file."""
    pass

class BulkloaderHelper(object):
    
    """Generates code for MOL/workflow/mol-data/bulkload_helper.py file."""

    @classmethod
    def Output(cls):
        indexed = DbfProps.indexed()
        print ''
        print 'def add_polygon(input_dict, instance, bulkload_state_copy):'
        print '    # Required'
        for x in indexed['required']:
            print "    instance['polygon.%s'] = transform.none_if_empty(str)(input_dict['%s'])" % (x, x)
        print '    # Optional'
        for x in indexed['optional']:
            print "    instance['polygon.%s'] = transform.none_if_empty(str)(input_dict['%s'])" % (x, x)
        print '    return instance'
        
        
    
class BulkloaderYaml(object):
    
    """Generates the MOL/workflow/mol-data/bulkloader.yaml code."""
    @classmethod
    def Output(cls):
        #dp = DbfProps.indexed()
        #dbf_props = dp['required'] + dp['optional'] 
        source_props = SourceProps.indexed()
        props = '\n    # Required source fields'
        for p in source_props['required']:
            props = '%s\n\n%s' % (props, cls.PROP_TEMPLATE % (p, p))
        props = '%s\n\n    # Optional source fields' % props
        for p in source_props['optional']:
            props = '%s\n\n%s' % (props, cls.PROP_TEMPLATE % (p, p))
        print cls.TEMPLATE
        print props
        print '\n  post_import_function: bulkload_helper.add_polygons'
        
    PROP_TEMPLATE = """    - property: %s
      external_name: %s
      import_transform: transform.none_if_empty(str)"""

    TEMPLATE = """
python_preamble:
- import: base64
- import: re
- import: google.appengine.ext.bulkload.transform
- import: google.appengine.ext.bulkload.bulkloader_wizard
- import: google.appengine.ext.db
- import: google.appengine.api.datastore
- import: google.appengine.api.users
- import: bulkload_helper
- import: ndb
- import: mol.db.layers

transformers:

- kind: Layer
  connector: csv
  connector_options:
    encoding: utf_8
  
  property_map:
    - property: __key__
      import_template: "%(layer_source)s-%(layer_collection)s-%(layer_filename)s"

    - property: source
      external_name: layer_source
      import_transform: transform.none_if_empty(str)

    - property: collection
      external_name: layer_collection
      import_transform: transform.none_if_empty(str)

    - property: filename
      external_name: layer_filename
      import_transform: transform.none_if_empty(str)

    #- property: json
    #  external_name: json
    #  import_transform: bulkload_helper.create_layer_json()

- kind: LayerIndex
  connector: csv
  connector_options:
    encoding: utf_8

  property_map:
    - property: __key__
      import_template: "%(layer_source)s-%(layer_collection)s-%(layer_filename)s"
      import_transform: bulkload_helper.create_layer_index_key()
    
# TODO: Full text for LayerIndex?
#    - property: corpus
#      external_name: layer_source
#      import_transform: bulkload_helper.get_corpus_list()"""

class ConfigYaml(object):
    
    TEMPLATE = """# This section provides information about the source, such as name and contact
# information.
# 
Source:
  name: 
  email:

# This section provides information about all collections provided by the 
# source.
# 
Collections:
  
# This section contains information about a single collection.
# 

# Required directory name of the collection.
# 
- DirectoryName:
   
  # Required MOL metadata (http://goo.gl/98r46)
  #  
  Required:
    %s

  # Optional MoL metadata (http://goo.gl/98r46)
  #
  Optional:
    %s

  # Mappings between collection DBF fields and MoL DBF fields: (http://goo.gl/UkzJW)
  #
  DBFMapping:

    # Required MoL DBF fields 
    #
    Required:
      %s

    # Optional MoL DBF fields
    #
    Optional:
      %s
"""
    
    @classmethod
    def Output(cls):
        source = SourceProps.all()
        source_required = ':    \n    '.join(source['required'])
        source_optional = ':    \n    '.join(source['optional'])
        dbf = DbfProps.all()
        dbf_required = ':      \n      '.join(dbf['required'])
        dbf_optional = ':      \n      '.join(dbf['optional'])
        print cls.TEMPLATE % (source_required, source_optional, dbf_required, dbf_optional)

class SourceProps(object):
    
    """Helper that provides source fields from the CSV file."""

    @classmethod
    def dr(cls):
        return csv.DictReader(open(SOURCE_FIELDS_CSV, 'r'))

    @classmethod
    def all(cls):
        required = []
        optional = []
        for row in cls.dr():
            fn = Source.fieldname(row)
            if not fn:
                continue
            if Source.required(row):
                required.append(fn)
            else:
                optional.append(fn)        
        required.sort()
        optional.sort()
        return dict(required=required, optional=optional)
    
    @classmethod
    def indexed(cls):
        required = []
        optional = []
        for row in cls.dr():
            if Source.indexed(row):
                fn = Source.fieldname(row)
                if not fn:
                    continue
                if Source.required(row):
                    required.append(fn)
                else:
                    optional.append(fn)        
        required.sort()
        optional.sort()
        return dict(required=required, optional=optional)
        
    @classmethod
    def LayerIndex(cls):
        fields = cls.indexed()
        print ''
        print 'class LayerIndex(model.Model):'
        print '    # The LayerPolygon'
        print '    polygon = model.StructuredProperty(LayerPolygon, repeated=True)'
        print '    # Full text corpus'
        print "    corpus = model.StringProperty('c', repeated=True)"
        print '    # Required fields'
        for prop in fields['required']:            
            print '    %s = model.StringProperty(required=True)' % prop
        print '    # Optional fields'
        for prop in fields['optional']:
            print '    %s = model.StringProperty()' % prop
        print ''

class DbfProps(object):
    
    """Helper that provides DBF fields from the CSV file."""

    @classmethod
    def dr(cls):
        return csv.DictReader(open(DBF_FIELDS_CSV, 'r'))

    @classmethod
    def all(cls):
        required = []
        optional = []
        for row in cls.dr():
            fn = Dbf.fieldname(row)
            if not fn:
                continue
            if Dbf.required(row):
                required.append(fn)
            else:
                optional.append(fn)        
        required.sort()
        optional.sort()
        return dict(required=required, optional=optional)
    
    @classmethod
    def indexed(cls):
        required = []
        optional = []
        for row in cls.dr():
            if Dbf.indexed(row):
                fn = Dbf.fieldname(row)
                if not fn:
                    continue
                if Dbf.required(row):
                    required.append(fn)
                else:
                    optional.append(fn)        
        required.sort()
        optional.sort()
        return dict(required=required, optional=optional)
    
    @classmethod
    def LayerPolygon(cls):
        fields = cls.indexed()
        print ''
        print 'class LayerPolygon(model.Model):'
        print '    # Required DBF fields'
        for prop in fields['required']:
            print '    %s = model.StringProperty(required=True)' % prop
        print '    # Optional DBF fields'
        for prop in fields['optional']:
            print '    %s = model.StringProperty()' % prop
        print ''

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    options = _getoptions()
    
    # Generate stuff and print to the console for copy/paste
    DbfProps.LayerPolygon()
    SourceProps.LayerIndex()
    ConfigYaml.Output()
    BulkloaderYaml.Output()
    BulkloaderHelper.Output()
