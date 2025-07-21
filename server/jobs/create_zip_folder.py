from celery import shared_task
import zipfile
import os
import logging

logger = logging.getLogger(__name__)

@shared_task(name='create_zip_folder', bind=True)
def create_zip_folder(self, file_paths, zip_dir, query):
    """
    Create a zip folder of all annotations
    1. Get all annotations that are completed
    2. For each annotation, create a zip folder
    3. Save the zip folder to the database
    """
    
    try:
        # Update task state to STARTED
        self.update_state(state='STARTED', meta={'status': 'Creating zip folder...'})
        
        # Validate inputs
        if not file_paths:
            raise ValueError("No file paths provided")
        
        # Make zip dir if it doesn't exist
        os.makedirs(zip_dir, exist_ok=True)
        #uniquely identify the query
        request_id = self.request.id
        zip_name = f"{request_id}.zip"
        logger.info(f"Creating zip file: {zip_name} in directory: {zip_dir}")
        
        zip_path = os.path.join(zip_dir, zip_name)
        
        if os.path.exists(zip_path):
            logger.info(f"Zip file already exists: {zip_name}")
            
            result = {
                "zip_file": zip_name,
                "download_url": f"/downloads/annotations/jobs/{request_id}/file",
                "file_count": len(file_paths),
                "query": query,
                "total_files_requested": len(file_paths)
            }
                    
            # Update task state to SUCCESS
            self.update_state(state='SUCCESS', meta=result)
            return result
        
        # Update task state to PROGRESS
        self.update_state(state='PROGRESS', meta={
            'status': f'Creating zip file with {len(file_paths)} files...',
            'current': 0,
            'total': len(file_paths)
        })
        
        files_added = 0
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for i, file_path in enumerate(file_paths):
                if os.path.exists(file_path):
                    arcname = os.path.basename(file_path)
                    zipf.write(file_path, arcname=arcname)
                    files_added += 1
                    
                    # Update progress every 10 files
                    if i % 10 == 0:
                        self.update_state(state='PROGRESS', meta={
                            'status': f'Added {files_added} files to zip...',
                            'current': files_added,
                            'total': len(file_paths)
                        })
                else:
                    logger.warning(f"File not found: {file_path}")
        
        result = {
            "zip_file": zip_name,
            "download_url": f"/downloads/annotations/jobs/{request_id}/file",
            "file_count": files_added,
            "query": query,
            "total_files_requested": len(file_paths)
        }
        
        logger.info(f"Successfully created zip file: {zip_name} with {files_added} files")
        
        # Update task state to SUCCESS
        self.update_state(state='SUCCESS', meta=result)
        
        return result
        
    except Exception as e:
        error_msg = f"Error creating zip folder: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Update task state to FAILURE
        self.update_state(state='FAILURE', meta={
            'error': error_msg,
            'exception': str(e)
        })
        
        # Re-raise the exception so Celery knows the task failed
        raise