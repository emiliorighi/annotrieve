def create_batches(annotations: list[object], batch_size: int=100) -> list[list[object]]:
    return [annotations[i:i+batch_size] for i in range(0, len(annotations), batch_size)]