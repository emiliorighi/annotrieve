import subprocess
import json

def get_data_from_ncbi(command):

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
