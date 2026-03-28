#!/bin/bash
pkill -9 -f telegram-review
sleep 2
node telegram-review.js > bot.log 2>&1 &
sleep 2
echo "Bot restarted. PID:"
ps aux | grep telegram-review | grep -v grep
