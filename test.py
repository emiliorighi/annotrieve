import requests

URL="http://localhost:5001/api/jobs/process_gffs"

resp = requests.post(URL, data={'username':'annotrieve-user', 'password':'annotrieve-pwd'})

print(resp.content)