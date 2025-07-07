#!/usr/bin/env python3
"""
Error Spike Simulator for AutoHeal-GCP
Simulates application errors to trigger healing actions
"""

import time
import threading
import requests
import argparse
import random
import sys
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class ErrorSpikeSimulator:
    def __init__(self, target_url: str):
        self.target_url = target_url.rstrip('/')
        self.error_count = 0
        self.success_count = 0
        self.running = False
    
    def make_error_request(self) -> dict:
        """Make a single request that should generate an error"""
        try:
            # Try different error-inducing endpoints
            error_endpoints = ['/error', '/500', '/crash', '/fail', '/nonexistent']
            endpoint = random.choice(error_endpoints)
            
            response = requests.get(
                f"{self.target_url}{endpoint}",
                timeout=5,
                headers={'User-Agent': 'AutoHeal-ErrorSimulator/1.0'}
            )
            
            if response.status_code >= 400:
                self.error_count += 1
                return {
                    'status': 'error',
                    'status_code': response.status_code,
                    'endpoint': endpoint
                }
            else:
                self.success_count += 1
                return {
                    'status': 'success',
                    'status_code': response.status_code,
                    'endpoint': endpoint
                }
                
        except requests.exceptions.RequestException as e:
            self.error_count += 1
            return {
                'status': 'exception',
                'error': str(e),
                'endpoint': endpoint if 'endpoint' in locals() else 'unknown'
            }
    
    def simulate_error_spike(self, duration: int = 300, requests_per_second: int = 10, max_workers: int = 20):
        """
        Simulate error spike by making many requests that should fail
        
        Args:
            duration: Duration in seconds
            requests_per_second: Number of requests per second
            max_workers: Maximum number of concurrent workers
        """
        print(f"💥 Starting error spike simulation...")
        print(f"Target URL: {self.target_url}")
        print(f"Duration: {duration} seconds ({duration/60:.1f} minutes)")
        print(f"Rate: {requests_per_second} requests/second")
        print(f"Max workers: {max_workers}")
        print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.running = True
        start_time = time.time()
        total_requests = 0
        
        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                while self.running and (time.time() - start_time) &lt; duration:
                    batch_start = time.time()
                    
                    # Submit batch of requests
                    futures = []
                    for _ in range(requests_per_second):
                        if not self.running:
                            break
                        future = executor.submit(self.make_error_request)
                        futures.append(future)
                        total_requests += 1
                    
                    # Wait for batch to complete or timeout
                    for future in as_completed(futures, timeout=1.0):
                        try:
                            result = future.result()
                        except Exception as e:
                            self.error_count += 1
                    
                    # Calculate timing for next batch
                    batch_duration = time.time() - batch_start
                    sleep_time = max(0, 1.0 - batch_duration)  # Aim for 1 second per batch
                    
                    elapsed = time.time() - start_time
                    remaining = max(0, duration - elapsed)
                    error_rate = (self.error_count / total_requests * 100) if total_requests > 0 else 0
                    
                    print(f"\r🔥 Requests: {total_requests} | "
                          f"Errors: {self.error_count} ({error_rate:.1f}%) | "
                          f"Success: {self.success_count} | "
                          f"Time: {elapsed:.0f}s/{duration}s", end="", flush=True)
                    
                    if sleep_time > 0:
                        time.sleep(sleep_time)
        
        except KeyboardInterrupt:
            print("\n🛑 Error spike simulation interrupted by user")
        finally:
            self.running = False
        
        print(f"\n✅ Error spike simulation completed!")
        print(f"Total requests: {total_requests}")
        print(f"Errors: {self.error_count}")
        print(f"Success: {self.success_count}")
        print(f"Error rate: {(self.error_count / total_requests * 100) if total_requests > 0 else 0:.1f}%")
        print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def test_target_url(url: str) -> bool:
    """Test if target URL is reachable"""
    try:
        response = requests.get(url, timeout=10)
        print(f"✅ Target URL is reachable (Status: {response.status_code})")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Target URL is not reachable: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="AutoHeal-GCP Error Spike Simulator")
    parser.add_argument("url", help="Target URL to send requests to")
    parser.add_argument("--duration", "-d", type=int, default=300,
                       help="Duration in seconds (default: 300)")
    parser.add_argument("--rate", "-r", type=int, default=10,
                       help="Requests per second (default: 10)")
    parser.add_argument("--workers", "-w", type=int, default=20,
                       help="Maximum concurrent workers (default: 20)")
    parser.add_argument("--test-only", action="store_true",
                       help="Only test target URL, don't simulate errors")
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.duration &lt; 1:
        print("❌ Duration must be at least 1 second")
        sys.exit(1)
    
    if args.rate &lt; 1:
        print("❌ Rate must be at least 1 request per second")
        sys.exit(1)
    
    if args.workers &lt; 1:
        print("❌ Workers must be at least 1")
        sys.exit(1)
    
    # Ensure URL has protocol
    url = args.url
    if not url.startswith(('http://', 'https://')):
        url = f"http://{url}"
    
    print("🛠️  AutoHeal-GCP Error Spike Simulator")
    print("=" * 50)
    
    # Test target URL
    if not test_target_url(url):
        if not args.test_only:
            response = input("Target URL is not reachable. Continue anyway? (y/N): ")
            if response.lower() != 'y':
                print("Simulation cancelled")
                sys.exit(1)
        else:
            sys.exit(1)
    
    if args.test_only:
        return
    
    # Run error spike simulation
    simulator = ErrorSpikeSimulator(url)
    try:
        simulator.simulate_error_spike(args.duration, args.rate, args.workers)
    except Exception as e:
        print(f"❌ Error during simulation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
