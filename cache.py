"""This module contains a cache that supports string and blob values. It supports
both because blobs are unable to encode unicode characters properly.
"""

__author__ = 'Aaron Steele'

# Standard Python imports
import logging
import json

# Google App Engine imports
from google.appengine.ext.ndb import model

class CacheItem(model.Model):
    """An item in the cache. Supports blob and string cached values since blob
    can't handle unicode characters.
    """
    blob = model.BlobProperty('b') 
    string = model.StringProperty('s', indexed=False) 
    created = model.DateTimeProperty('c', auto_now_add=True)
    
    @classmethod 
    def create(cls, key, value, dumps=False, value_type='string'):
        entity = None
        if value_type == 'string':
            if dumps:
                entity = cls(id=key.strip().lower(), string=json.dumps(value))
            else:
                entity = cls(id=key.strip().lower(), string=value)
        elif value_type == 'blob':
            entity = cls(id=key.strip().lower(), blob=value)
        return entity

    @classmethod
    def get(cls, key, loads=False, value_type='string'):
        value = None
        item = model.Key(cls.__name__, key.strip().lower()).get()
        if item:            
            if value_type == 'string':
                data = item._to_dict()['string']
                if loads:
                    try:
                        value = json.loads(data)
                    except:
                        value = data
                else:
                    value = data
            elif value_type == 'blob':
                value = item.blob

        return value

    @classmethod
    def add(cls, key, value, dumps=False, value_type='string'):
        cls.create(key, value, dumps, value_type).put()
    
def create_entry(key, value, dumps=False, value_type='string'):
    return CacheItem.create(key, value, dumps, value_type)

def get(key, loads=False, value_type='string'):
    """Gets a cached item value by key.

    Arguments:
        key - The cache item key.
        loads - If true call json.loads() on cached item (default false).
        value_type - The type of cache value (string or blob, default string).
    """
    return CacheItem.get(key, loads, value_type)

def add(key, value, dumps=False, value_type='string'):
    """Adds a value to the cache by key.

    Arguments:
        key - The cache item key.
        value - The cache item value.
        dumps - If true call json.dumps() to value before caching (default false).
        value_type - The type of cache value (string or blob, default string).
    """
    CacheItem.add(key, value, dumps, value_type)
