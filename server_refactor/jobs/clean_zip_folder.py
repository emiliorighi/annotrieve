from celery import shared_task
import os
import logging
import time

logger = logging.getLogger(__name__)

ZIP_FOLDER_PATH = os.getenv('ZIP_FOLDER_PATH')
TIME_TO_KEEP = os.getenv('TIME_TO_KEEP', 60 * 60)

@shared_task(name='clean_zip_folder', bind=True)
def clean_zip_folder(self):
    """
    Clean zip folders that are older than 24 hours
    1. Delete the zip folder
    """
    
    try:
        # Update task state to STARTED
        self.update_state(state='STARTED', meta={'status': 'Cleaning zip folder...'})
        
        # Validate inputs
        if not ZIP_FOLDER_PATH:
            raise ValueError("No zip directory provided")
        
        if not os.path.exists(ZIP_FOLDER_PATH):
            raise ValueError("Zip directory does not exist")
        
        # Get all zip files in the directory
        zip_files = [f for f in os.listdir(ZIP_FOLDER_PATH) if f.endswith('.zip')]
        # Delete all zip files older than 24 hours
        count = 0
        for zip_file in zip_files:
            zip_path = os.path.join(ZIP_FOLDER_PATH, zip_file)
            #check if file is older than 24 hours
            if os.path.exists(zip_path):
                if os.path.getmtime(zip_path) < time.time() - TIME_TO_KEEP:
                    count += 1
                    os.remove(zip_path)
        
        logger.info(f"Successfully cleaned zip folder: {ZIP_FOLDER_PATH} with {count} files")
        
        # Update task state to SUCCESS
        self.update_state(state='SUCCESS', meta={'status': 'Zip folder cleaned successfully'})
        
        return {'status': 'Zip folder cleaned successfully'}
                    
    except Exception as e:
        error_msg = f"Error cleaning zip folder: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Update task state to FAILURE
        self.update_state(state='FAILURE', meta={
            'error': error_msg,
            'exception': str(e)
        })
        
        # Re-raise the exception so Celery knows the task failed
        raise
        