from flask_restful import Api
from .routes import initialize_routes

api = None

def initialize_api(app):
	app.logger.info("Initializing REST Apis")
	api = Api(app)
	initialize_routes(api)