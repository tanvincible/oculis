"""
ChromaDB Data Ingestion Script for Balance Sheet Analysis
Run this script separately after app.py has initialized the database.

This script:
1. Reads balance sheet data from SQLite
2. Creates text chunks suitable for RAG
3. Generates embeddings using Google Gemini
4. Stores in ChromaDB with proper metadata for RBAC filtering
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Company, BalanceSheetEntry
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
import chromadb
from chromadb.config import Settings
from langchain_core.documents import Document


def create_text_chunk(entry, company_name):
    """
    Create a descriptive text chunk for a balance sheet entry.
    Format: "For [Company] in [Year], [Metric] was [Value] [Currency]."
    """
    return (
        f"For {company_name} in {entry.year}, "
        f"{entry.metric} was {entry.value} {entry.currency}."
    )


def get_unique_document_id(entry):
    """Generate a unique document ID for deduplication."""
    return f"company_{entry.company_id}_year_{entry.year}_metric_{entry.metric.replace(' ', '_')}"


def main():
    """Main ingestion function."""
    print("🚀 Starting ChromaDB data ingestion...")

    # Verify API key
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment variables")
        return

    # Initialize embeddings model
    print("📡 Initializing Google Gemini embeddings...")
    try:
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001", google_api_key=gemini_api_key
        )
    except Exception as e:
        print(f"❌ Error initializing embeddings: {e}")
        return

    # Initialize ChromaDB client with persistence
    chroma_db_dir = "./chroma_db"
    print(f"💾 Setting up ChromaDB at {chroma_db_dir}...")

    try:
        # Create persistent client
        persistent_client = chromadb.PersistentClient(path=chroma_db_dir)

        # Initialize Chroma vector store
        vectorstore = Chroma(
            client=persistent_client,
            collection_name="balance_sheet_data",
            embedding_function=embeddings,
        )
    except Exception as e:
        print(f"❌ Error setting up ChromaDB: {e}")
        return

    # Work within Flask app context
    with app.app_context():
        print("🔍 Fetching balance sheet data from SQLite...")

        # Get all balance sheet entries with company information
        entries = (
            db.session.query(BalanceSheetEntry, Company)
            .join(Company, BalanceSheetEntry.company_id == Company.id)
            .all()
        )

        if not entries:
            print("⚠️  No balance sheet entries found in database")
            return

        print(f"📊 Found {len(entries)} balance sheet entries")

        # Check existing documents to avoid duplicates
        try:
            existing_docs = vectorstore.get()
            existing_ids = set(existing_docs.get("ids", []))
            print(
                f"📋 Found {len(existing_ids)} existing documents in ChromaDB"
            )
        except Exception:
            existing_ids = set()
            print("📋 ChromaDB collection is empty")

        # Prepare data for batch insertion
        documents = []
        metadatas = []
        ids = []

        processed_count = 0
        skipped_count = 0

        for entry, company in entries:
            doc_id = get_unique_document_id(entry)

            # Skip if already exists
            if doc_id in existing_ids:
                skipped_count += 1
                continue

            # Create text chunk
            text_chunk = create_text_chunk(entry, company.name)

            # Create metadata for RBAC filtering and context
            metadata = {
                "company_id": entry.company_id,
                "company_name": company.name,
                "year": entry.year,
                "metric": entry.metric,
                "value": float(entry.value),
                "currency": entry.currency,
                "entry_id": entry.id,
            }

            documents.append(
                Document(page_content=text_chunk, metadata=metadata)
            )
            ids.append(doc_id)
            processed_count += 1

        if not documents:
            print(
                "✅ All data already exists in ChromaDB. No new documents to add."
            )
            return

        # Batch insert documents
        print(f"⏳ Adding {len(documents)} new documents to ChromaDB...")
        try:
            vectorstore.add_documents(documents=documents, ids=ids)

            print(f"✅ Successfully processed {processed_count} new entries")
            print(f"⏩ Skipped {skipped_count} existing entries")
            print(
                f"📚 Total documents in ChromaDB: {len(existing_ids) + processed_count}"
            )

        except Exception as e:
            print(f"❌ Error adding documents to ChromaDB: {e}")
            return

    print("🎉 Data ingestion completed successfully!")


if __name__ == "__main__":
    main()
