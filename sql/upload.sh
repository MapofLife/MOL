#!/bin/bash

#
# Generic script to upload sql to Carto DB
# Params:
#   account
#   api_key
#   sql file
#

url="https://$1.cartodb.com/api/v2/sql?api_key=$2"
sql=`cat $3`
curl -v -F q="$sql" $url 
