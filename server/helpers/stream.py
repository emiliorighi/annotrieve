import json

def stream_jsonl_file(file_path):
    with open(file_path, 'r') as f:
        for line in f:
            yield json.loads(line)

def stream_tsv_file(response):
    for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
        if not line.strip() or line_num == 1:
            continue
        row = line.split('\t')
        if len(row) < 6:
            continue
        yield row

