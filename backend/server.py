"""
Proxy wrapper to run the Hono SOAP Notes app
"""
import subprocess
import os
import sys

# Start the Node.js app on port 8001
os.chdir('/app')
env = os.environ.copy()
env['PORT'] = '8001'
env['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin123')

subprocess.run(['npx', 'tsx', 'src/server.ts'], env=env)
