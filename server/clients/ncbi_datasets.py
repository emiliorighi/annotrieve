import subprocess
import json
import requests


def get_sequence_report(accession):
    response = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v2alpha/genome/accession/{accession}/sequence_reports?role_filters=assembled-molecule&page_size=1000")
    response.raise_for_status()
    return response.json().get('reports', [])

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
    