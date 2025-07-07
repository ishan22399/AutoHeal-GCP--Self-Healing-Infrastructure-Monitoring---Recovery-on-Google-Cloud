#!/usr/bin/env python3
"""
Memory Leak Simulator for AutoHeal-GCP
Simulates memory leak to trigger healing actions
"""

import time
import threading
import argparse
import psutil
import sys
from datetime import datetime

class MemoryLeakSimulator:
    def __init__(self):
        self.memory_hogs = []
        self.running = False
    
    def simulate_memory_leak(self, duration: int = 300, rate_mb_per_sec: float = 10.0, max_memory_gb: float = 2.0):
        """
        Simulate memory leak
        
        Args:
            duration: Duration in seconds
            rate_mb_per_sec: Memory allocation rate in MB per second
            max_memory_gb: Maximum memory to allocate in GB
        """
        print(f"🧠 Starting memory leak simulation...")
        print(f"Duration: {duration} seconds ({duration/60:.1f} minutes)")
        print(f"Allocation rate: {rate_mb_per_sec} MB/second")
        print(f"Maximum memory: {max_memory_gb} GB")
        print(f"Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.running = True
        start_time = time.time()
        total_allocated_mb = 0
        max_memory_mb = max_memory_gb * 1024
        
        try:
            while self.running and (time.time() - start_time) &lt; duration:
                if total_allocated_mb >= max_memory_mb:
                    print(f"\n⚠️  Reached maximum memory limit ({max_memory_gb} GB)")
                    break
                
                # Allocate memory (1MB chunks)
                chunk_size = min(int(rate_mb_per_sec), int(max_memory_mb - total_allocated_mb))
                if chunk_size &lt;= 0:
                    break
                
                # Allocate memory chunk
                memory_chunk = bytearray(chunk_size * 1024 * 1024)  # Convert MB to bytes
                self.memory_hogs.append(memory_chunk)
                total_allocated_mb += chunk_size
                
                # Get current memory usage
                process = psutil.Process()
                memory_info = process.memory_info()
                memory_percent = process.memory_percent()
                
                elapsed = time.time() - start_time
                remaining = max(0, duration - elapsed)
                
                print(f"\r💾 Allocated: {total_allocated_mb:.0f}MB | "
                      f"RSS: {memory_info.rss / 1024 / 1024:.0f}MB | "
                      f"Memory%: {memory_percent:.1f}% | "
                      f"Time: {elapsed:.0f}s/{duration}s", end="", flush=True)
                
                time.sleep(1)  # Wait 1 second before next allocation
        
        except KeyboardInterrupt:
            print("\n🛑 Memory leak simulation interrupted by user")
        except MemoryError:
            print("\n❌ Out of memory! System memory exhausted.")
        finally:
            self.running = False
        
        print(f"\n✅ Memory leak simulation completed!")
        print(f"Total allocated: {total_allocated_mb:.0f} MB")
        print(f"End time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    def cleanup(self):
        """Clean up allocated memory"""
        print("🧹 Cleaning up allocated memory...")
        self.memory_hogs.clear()
        print("✅ Memory cleanup completed!")

def monitor_system_memory():
    """Monitor and display system memory usage"""
    memory = psutil.virtual_memory()
    print(f"📊 System Memory Status:")
    print(f"   Total: {memory.total / 1024 / 1024 / 1024:.1f} GB")
    print(f"   Available: {memory.available / 1024 / 1024 / 1024:.1f} GB")
    print(f"   Used: {memory.used / 1024 / 1024 / 1024:.1f} GB ({memory.percent:.1f}%)")
    print(f"   Free: {memory.free / 1024 / 1024 / 1024:.1f} GB")

def main():
    parser = argparse.ArgumentParser(description="AutoHeal-GCP Memory Leak Simulator")
    parser.add_argument("--duration", "-d", type=int, default=300,
                       help="Duration in seconds (default: 300)")
    parser.add_argument("--rate", "-r", type=float, default=10.0,
                       help="Memory allocation rate in MB/second (default: 10.0)")
    parser.add_argument("--max-memory", "-m", type=float, default=2.0,
                       help="Maximum memory to allocate in GB (default: 2.0)")
    parser.add_argument("--monitor-only", action="store_true",
                       help="Only monitor system memory, don't simulate leak")
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.duration &lt; 1:
        print("❌ Duration must be at least 1 second")
        sys.exit(1)
    
    if args.rate &lt;= 0:
        print("❌ Rate must be greater than 0")
        sys.exit(1)
    
    if args.max_memory &lt;= 0:
        print("❌ Max memory must be greater than 0")
        sys.exit(1)
    
    print("🛠️  AutoHeal-GCP Memory Leak Simulator")
    print("=" * 50)
    
    # Show initial system memory status
    monitor_system_memory()
    print()
    
    if args.monitor_only:
        print("👀 Monitoring system memory (Ctrl+C to stop)...")
        try:
            while True:
                time.sleep(5)
                print("\r" + " " * 80 + "\r", end="")  # Clear line
                monitor_system_memory()
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped")
        return
    
    # Check available memory
    memory = psutil.virtual_memory()
    available_gb = memory.available / 1024 / 1024 / 1024
    
    if args.max_memory > available_gb * 0.8:  # Don't use more than 80% of available memory
        print(f"⚠️  Warning: Requested memory ({args.max_memory} GB) is close to available memory ({available_gb:.1f} GB)")
        response = input("Continue? (y/N): ")
        if response.lower() != 'y':
            print("Simulation cancelled")
            return
    
    # Run memory leak simulation
    simulator = MemoryLeakSimulator()
    try:
        simulator.simulate_memory_leak(args.duration, args.rate, args.max_memory)
    except Exception as e:
        print(f"❌ Error during simulation: {e}")
    finally:
        simulator.cleanup()

if __name__ == "__main__":
    main()
