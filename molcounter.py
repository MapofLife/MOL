from google.appengine.api import memcache 
from google.appengine.ext import db
import random
import collections
import logging

class NameCounterShardConfig(db.Model):
  """Tracks the number of shards for each named counter."""
  name = db.StringProperty(required=True)
  num_shards = db.IntegerProperty(required=True, default=20)


class NameCounterShard(db.Model):
  """Shards for each named counter"""
  name = db.StringProperty(required=True)
  count = db.IntegerProperty(required=True, default=0)
  
            
def get_top_names(top_count, all_results=False):
  """Returns a dictionary of the top counts and all counts."""
  results = collections.Counter()

  for counter in NameCounterShard.all():
    results[counter.name] += counter.count
  top = results.most_common(top_count)

  if all_results:
    return {'top-%s-counts' % top_count: top, 'all-counts': results}
  else:
    return {'top-%s' % top_count: top}

def get_count(name):
  """Retrieve the value for a given sharded counter.
  
  Parameters:
    name - The name of the counter  
  """
  total = memcache.get(name)
  if total is None:
    total = 0
    for counter in NameCounterShard.all().filter('name = ', name):
      total += counter.count
    memcache.add(name, total, 60)
  return total

def increment(name):
  """Increment the value for a given sharded counter.
  
  Parameters:
    name - The name of the counter  
  """
  config = NameCounterShardConfig.get_or_insert(name, name=name)
  def txn():
    index = random.randint(0, config.num_shards - 1)
    shard_name = name + str(index)
    counter = NameCounterShard.get_by_key_name(shard_name)
    if counter is None:
      counter = NameCounterShard(key_name=shard_name, name=name)
    counter.count += 1
    counter.put()
  db.run_in_transaction(txn)
  # does nothing if the key does not exist
  memcache.incr(name)
  
def increase_shards(name, num):  
  """Increase the number of shards for a given sharded counter.
  Will never decrease the number of shards.
  
  Parameters:
    name - The name of the counter
    num - How many shards to use
    
  """
  config = NameCounterShardConfig.get_or_insert(name, name=name)
  def txn():
    if config.num_shards < num:
      config.num_shards = num
      config.put()    
  db.run_in_transaction(txn)


