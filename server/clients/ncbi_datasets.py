import subprocess
import json
import time
import os
import requests
# Global rate limiting state
_rate_counter = 0
_last_reset_time = time.time()
_total_api_calls = 0
_total_wait_time = 0

# Rate limiting configuration
RATE_LIMIT_CALLS = int(os.getenv('NCBI_RATE_LIMIT_CALLS', '3'))  # Calls before waiting
RATE_LIMIT_WAIT = float(os.getenv('NCBI_RATE_LIMIT_WAIT', '1.0'))  # Seconds to wait

def _apply_rate_limiting():
    """
    Apply rate limiting for NCBI API calls.
    Waits if the rate limit is exceeded.
    """
    global _rate_counter, _last_reset_time, _total_api_calls, _total_wait_time
    
    _rate_counter += 1
    _total_api_calls += 1
    
    if _rate_counter >= RATE_LIMIT_CALLS:
        wait_start = time.time()
        time.sleep(RATE_LIMIT_WAIT)
        wait_time = time.time() - wait_start
        _total_wait_time += wait_time
        
        _rate_counter = 0
        _last_reset_time = time.time()

def reset_rate_limiting_state():
    """
    Reset the global rate limiting state.
    Useful for testing or when starting a new batch of operations.
    """
    global _rate_counter, _last_reset_time, _total_api_calls, _total_wait_time
    
    _rate_counter = 0
    _last_reset_time = time.time()
    _total_api_calls = 0
    _total_wait_time = 0
    

def get_rate_limiting_stats():
    """
    Get statistics about rate limiting usage.
    
    Returns:
        dict: Statistics about API calls and rate limiting
    """
    global _total_api_calls, _total_wait_time, _last_reset_time
    
    return {
        'total_api_calls': _total_api_calls,
        'total_wait_time': _total_wait_time,
        'rate_limit_calls': RATE_LIMIT_CALLS,
        'rate_limit_wait': RATE_LIMIT_WAIT,
        'last_reset_time': _last_reset_time,
        'time_since_last_reset': time.time() - _last_reset_time,
        'average_wait_time_per_call': _total_wait_time / _total_api_calls if _total_api_calls > 0 else 0
    }

def get_data_from_ncbi(command):

    # Apply rate limiting before starting the API call
    _apply_rate_limiting()
    
    CMD = ["datasets", "summary"]

    CMD.extend(command)
    # Execute the script and capture its output
    result = subprocess.run(CMD, capture_output=True, text=True)
    
    # Check if the script executed successfully
    if result.returncode == 0:
        # Load the JSON output into a dictionary
        try:
            output_dict = json.loads(result.stdout)
            return output_dict
        except json.JSONDecodeError as e:
            print("Error decoding JSON:", e)
            return None
    else:
        print("Error executing script:", result.stderr)
        return None
    
def stream_jsonlines_from_ncbi(command):
    CMD = ["datasets", "summary"]
    CMD.extend(command)
    CMD.append('--as-json-lines')
    
    # Apply rate limiting before starting the API call
    _apply_rate_limiting()
    
    try:
        process = subprocess.Popen(CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        for line in process.stdout:
            try:
                yield json.loads(line.strip())
            except json.JSONDecodeError as e:
                print("Invalid JSON line:", line.strip(), "\nError:", e)
                continue

        process.stdout.close()
        return_code = process.wait()

        if return_code != 0:
            stderr = process.stderr.read()
            print("Command failed:", stderr)

    except Exception as e:
        print("Error during streaming:", e)


def get_assembled_molecules_from_ncbi(assembly_accession):
    """
    Get assembled molecules from NCBI.
    """
    _apply_rate_limiting()
    api_url = f"https://api.ncbi.nlm.nih.gov/datasets/v2/genome/accession/{assembly_accession}/sequence_reports?role_filters=assembled-molecule&page_size=1000"
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        return response.json().get('reports', [])
    except Exception as e:
        print(f"Error getting assembled molecules from NCBI: {e}")
        return None

