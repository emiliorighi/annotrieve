from celery import shared_task

@shared_task(name='compute_stats', ignore_result=False)
def compute_stats():
    """
    Compute the stats for the annotations
    """
