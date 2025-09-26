from mongoengine import connect, disconnect
from configs.app_settings import settings
import logging

def connect_to_db():
    """Connect to MongoDB."""
    logging.info("Connecting to MongoDB...")
    connect(
        db=settings.MONGODB_DB,
        host=settings.MONGODB_HOST,
        port=settings.MONGODB_PORT,
        username=settings.MONGODB_USERNAME,
        password=settings.MONGODB_PASSWORD,
        authentication_source='admin'
    )
    logging.info("Successfully connected to MongoDB.")

def close_db_connection():
    """Close MongoDB connection."""
    logging.info("Closing MongoDB connection...")
    disconnect()
    logging.info("Successfully closed MongoDB connection.") 