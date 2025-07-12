from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from .config import Config

db = SQLAlchemy()
login_mgr = LoginManager()


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    db.init_app(app)
    login_mgr.init_app(app)
    login_mgr.login_view = "auth.login"

    from .routes import auth, ingest, chat

    app.register_blueprint(auth.bp)
    app.register_blueprint(ingest.bp, url_prefix="/api")
    app.register_blueprint(chat.bp, url_prefix="/api")

    with app.app_context():
        db.create_all()

        # Initialize vector store on first run
        try:
            from .services.rag_service import RAGService
            from .services.embedding_service import EmbeddingService

            rag_service = RAGService()
            embedding_service = EmbeddingService(rag_service)
            # Uncomment to populate on startup:
            embedding_service.populate_vector_store()
        except Exception as e:
            app.logger.warning(f"Vector store initialization failed: {e}")

    return app
