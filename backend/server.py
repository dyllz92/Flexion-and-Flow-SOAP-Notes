"""
FastAPI proxy to run the Hono SOAP Notes app
"""
import subprocess
import os
import signal
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import threading
import time

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global reference to the Node process
node_process = None

def start_node_server():
    global node_process
    os.chdir('/app')
    env = os.environ.copy()
    env['PORT'] = '8001'
    
    # Respect ADMIN_PASSWORD from the environment/.env used by the Node app.
    # Do not force a fallback here, otherwise it overrides dotenv values.
    node_process = subprocess.Popen(
        ['npx', 'tsx', 'src/server.ts'],
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    node_process.wait()

# Start Node server in a separate thread
thread = threading.Thread(target=start_node_server, daemon=True)
thread.start()

# Wait for Node server to start
time.sleep(3)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Node.js server starting..."}
