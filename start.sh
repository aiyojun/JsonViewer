#!/bin/sh

p_dir=$(cd `dirname $0`; pwd)
rm -rf $p_dir/venv
rm -rf $p_dir/server.log
python -m venv venv
$p_dir/venv/bin/pip install -r requirements.txt
p_port=8090
nohup $p_dir/venv/bin/python $p_dir/server.py -P $p_port -p $p_dir >$p_dir/server.log 2>&1 &
echo "Server started, port: ${p_port}"
echo "If you have any problem, call Jun.Dai!"
