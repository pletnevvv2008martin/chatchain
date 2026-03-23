#!/bin/bash
ssh -o StrictHostKeyChecking=no root@179.61.145.218 << 'ENDSSH'
cd /root/chatchain
export PATH="$HOME/.bun/bin:$PATH"
bun run build
pm2 restart chatchain-site
pm2 list
ENDSSH
