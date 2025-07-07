#!/bin/bash

# Startup script for test VM
# This script installs monitoring agent and sets up test applications

# Update system
apt-get update
apt-get install -y python3 python3-pip stress-ng htop

# Install Cloud Monitoring agent
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install

# Create a simple web server for testing
cat > /home/test_app.py &lt;&lt; 'EOF'
#!/usr/bin/env python3
import http.server
import socketserver
import threading
import time
import random
import os

PORT = 8080

class TestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "healthy", "timestamp": "' + str(time.time()).encode() + b'"}')
        elif self.path == '/stress':
            # Simulate high CPU usage
            os.system('stress-ng --cpu 2 --timeout 60s &')
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'CPU stress test started for 60 seconds')
        elif self.path == '/error':
            # Simulate application error
            self.send_response(500)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Simulated application error')
        else:
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            html = '''
            <html>
            <head><title>AutoHeal Test Service</title></head>
            <body>
                <h1>AutoHeal Test Service</h1>
                <p>Endpoints:</p>
                <ul>
                    <li><a href="/health">/health</a> - Health check</li>
                    <li><a href="/stress">/stress</a> - Trigger CPU stress</li>
                    <li><a href="/error">/error</a> - Trigger error</li>
                </ul>
            </body>
            </html>
            '''
            self.wfile.write(html.encode())

with socketserver.TCPServer(("", PORT), TestHandler) as httpd:
    print(f"Server running on port {PORT}")
    httpd.serve_forever()
EOF

# Make the script executable
chmod +x /home/test_app.py

# Create systemd service
cat > /etc/systemd/system/test-app.service &lt;&lt; 'EOF'
[Unit]
Description=AutoHeal Test Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home
ExecStart=/usr/bin/python3 /home/test_app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable test-app
systemctl start test-app

# Log startup completion
echo "AutoHeal test VM startup completed at $(date)" >> /var/log/autoheal-startup.log
