#!/usr/bin/env python3
"""
CPU Spike Simulator for AutoHeal-GCP
Simulates high CPU usage to trigger healing actions
"""

import time
import threading
import multiprocessing
import argparse
import requests
import sys
from datetime import datetime

def cpu_intensive_task(duration: int):
    """Run CPU intensive task for specified duration"""
    end_time = time.time() + duration
    while time.time() &lt; end_time:
        # Perform CPU intensive operations
        for i in range(1000000):
            _ = i ** 2
        time.sleep(0.001)  # Small sleep to prevent complete system freeze

def simulate_cpu_spike(duration: int = 300, intensity: int = 80):
    """
    Simulate CPU spike
    
    Args:
        duration: Duration in seconds (default: 5 minutes)
        intensity: CPU usage intensity as percentage (default: 80%)
    """
    print(f"🔥 Starting CPU spike simulation...")
    print(f"Duration: {duration} seconds ({duration/60:.1f} minutes)")
    print(f"Intensity: {intensity}% CPU usage")
    print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Calculate number of threads based on intensity and CPU count
    cpu_count = multiprocessing.cpu_count()
    thread_count = max(1, int(cpu_count * intensity / 100))
    
    print(f"Using {thread_count} threads on {cpu_count} CPU cores")
    
    # Start CPU intensive threads
    threads = []
    for i in range(thread_count):
        thread = threading.Thread(target=cpu_intensive_task, args=(duration,))
        thread.daemon = True
        thread.start()
        threads.append(thread)
        print(f"Started thread {i+1}/{thread_count}")
    
    # Monitor progress
    start_time = time.time()
    try:
        while any(thread.is_alive() for thread in threads):
            elapsed = time.time() - start_time
            remaining = max(0, duration - elapsed)
            progress = (elapsed / duration) * 100
            
            print(f"\r⏱️  Progress: {progress:.1f}% | Elapsed: {elapsed:.0f}s | Remaining: {remaining:.0f}s", end="", flush=True)
            time.sleep(5)
    
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrupted by user")
        return
    
    # Wait for all threads to complete
    for thread in threads:
        thread.join()
    
    print(f"\n✅ CPU spike simulation completed!")
    print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def test_vm_endpoint(vm_ip: str, endpoint: str = "/stress"):
    """Test VM endpoint to trigger stress"""
    try:
        url = f"http://{vm_ip}:8080{endpoint}"
        print(f"🌐 Testing VM endpoint: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Response: {response.status_code} - {response.text}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to reach VM endpoint: {e}")

def main():
    parser = argparse.ArgumentParser(description="AutoHeal-GCP CPU Spike Simulator")
    parser.add_argument("--duration", "-d", type=int, default=300, 
                       help="Duration in seconds (default: 300)")
    parser.add_argument("--intensity", "-i", type=int, default=80, 
                       help="CPU intensity percentage (default: 80)")
    parser.add_argument("--vm-ip", type=str, 
                       help="VM IP address to test endpoint")
    parser.add_argument("--endpoint-only", action="store_true",
                       help="Only test VM endpoint, don't run local CPU spike")
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.intensity &lt; 1 or args.intensity > 100:
        print("❌ Intensity must be between 1 and 100")
        sys.exit(1)
    
    if args.duration &lt; 1:
        print("❌ Duration must be at least 1 second")
        sys.exit(1)
    
    print("🛠️  AutoHeal-GCP CPU Spike Simulator")
    print("=" * 50)
    
    # Test VM endpoint if provided
    if args.vm_ip:
        test_vm_endpoint(args.vm_ip)
        if args.endpoint_only:
            return
    
    # Run local CPU spike simulation
    try:
        simulate_cpu_spike(args.duration, args.intensity)
    except Exception as e:
        print(f"❌ Error during simulation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
