#!/bin/bash
pkill -f telegram-review.js 2>/dev/null
sleep 2
source ../../.env
node dist/telegram-review.js
