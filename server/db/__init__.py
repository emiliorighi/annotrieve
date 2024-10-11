from flask_mongoengine import MongoEngine

db = MongoEngine()

def initialize_db(app):
	app.logger.info("Initializing MongoDB")
	# app.session_interface = MongoEngineSessionInterface(db)
	db.init_app(app)
	