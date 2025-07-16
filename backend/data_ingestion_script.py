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

# Import create_app from app.py to get the app instance
from app import create_app
# Import db, Company, and BalanceSheet (corrected model name) from models
from models import db, Company, BalanceSheet # Corrected: BalanceSheet instead of BalanceSheetEntry
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
import chromadb
from chromadb.config import Settings
from langchain_core.documents import Document


def create_text_chunk(entry, company_name, currency):
    """
    Create a descriptive text chunk for a balance sheet entry.
    Format: "For [Company] in [Year], [Metric] was [Value] [Currency]."
    """
    # Assuming 'entry' now directly represents a BalanceSheet object with attributes
    # like revenue, net_income, assets, liabilities.
    # We'll create chunks for each available metric.
    chunks = []
    if entry.revenue is not None:
        chunks.append(f"For {company_name} in {entry.year}, Revenue was {entry.revenue} {currency}.")
    if entry.net_income is not None:
        chunks.append(f"For {company_name} in {entry.year}, Net Income was {entry.net_income} {currency}.")
    if entry.assets is not None:
        chunks.append(f"For {company_name} in {entry.year}, Total Assets were {entry.assets} {currency}.")
    if entry.liabilities is not None:
        chunks.append(f"For {company_name} in {entry.year}, Total Liabilities were {entry.liabilities} {currency}.")

    # If the PDF text was stored, include it as a general context chunk
    if entry.pdf_text:
        chunks.append(f"Full balance sheet text for {company_name} in {entry.year}: {entry.pdf_text}")

    return "\n".join(chunks) # Join all relevant chunks


def get_unique_document_id(company_id, year, metric_name=None):
    """
    Generate a unique document ID for deduplication.
    Now includes metric_name to allow separate chunks for different metrics from the same year.
    If metric_name is None, it's for the full PDF text.
    """
    if metric_name:
        return f"company_{company_id}_year_{year}_metric_{metric_name.replace(' ', '_').lower()}"
    return f"company_{company_id}_year_{year}_full_text"


def main():
    """Main ingestion function."""
    print("🚀 Starting ChromaDB data ingestion...")

    # Create the Flask app instance
    app = create_app()

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
            collection_name="balance_sheet_data", # Ensure this matches the collection name in ai_model.py
            embedding_function=embeddings,
        )
    except Exception as e:
        print(f"❌ Error setting up ChromaDB: {e}")
        return

    # Work within Flask app context
    with app.app_context():
        print("🔍 Fetching balance sheet data from SQLite...")

        # Get all BalanceSheet entries with company information
        # Corrected: Query BalanceSheet model directly
        entries_with_companies = (
            db.session.query(BalanceSheet, Company)
            .join(Company, BalanceSheet.company_id == Company.id)
            .all()
        )

        if not entries_with_companies:
            print("⚠️  No balance sheet entries found in database")
            return

        print(f"📊 Found {len(entries_with_companies)} balance sheet records")

        # Check existing documents to avoid duplicates
        try:
            existing_docs = vectorstore.get(limit=10000) # Fetch more to be safe
            existing_ids = set(existing_docs.get("ids", []))
            print(
                f"📋 Found {len(existing_ids)} existing documents in ChromaDB"
            )
        except Exception as e:
            existing_ids = set()
            print(f"📋 ChromaDB collection is empty or error fetching: {e}")

        # Prepare data for batch insertion
        documents_to_add = []
        metadatas_to_add = []
        ids_to_add = []

        processed_count = 0
        skipped_count = 0

        for balance_sheet_record, company in entries_with_companies:
            # Create chunks for each metric and the full text
            metrics_to_chunk = {
                "Revenue": balance_sheet_record.revenue,
                "Net Income": balance_sheet_record.net_income,
                "Total Assets": balance_sheet_record.assets,
                "Total Liabilities": balance_sheet_record.liabilities,
            }

            # Chunks for individual metrics
            for metric_name, value in metrics_to_chunk.items():
                if value is not None:
                    text_chunk = f"For {company.name} in {balance_sheet_record.year}, {metric_name} was {value} {company.currency}."
                    doc_id = get_unique_document_id(balance_sheet_record.company_id, balance_sheet_record.year, metric_name)

                    if doc_id in existing_ids:
                        skipped_count += 1
                        continue

                    metadata = {
                        "company_id": balance_sheet_record.company_id,
                        "company_name": company.name,
                        "year": balance_sheet_record.year,
                        "metric": metric_name,
                        "value": float(value),
                        "currency": company.currency,
                        "source": f"BalanceSheet_{company.id}_{balance_sheet_record.year}.pdf" # Consistent source name
                    }
                    documents_to_add.append(text_chunk)
                    metadatas_to_add.append(metadata)
                    ids_to_add.append(doc_id)
                    processed_count += 1

            # Chunk for full PDF text (if available)
            if balance_sheet_record.pdf_text:
                full_text_doc_id = get_unique_document_id(balance_sheet_record.company_id, balance_sheet_record.year, "full_text")
                if full_text_doc_id not in existing_ids:
                    documents_to_add.append(balance_sheet_record.pdf_text)
                    metadatas_to_add.append({
                        "company_id": balance_sheet_record.company_id,
                        "company_name": company.name,
                        "year": balance_sheet_record.year,
                        "metric": "Full Document",
                        "source": f"BalanceSheet_{company.id}_{balance_sheet_record.year}.pdf"
                    })
                    ids_to_add.append(full_text_doc_id)
                    processed_count += 1
                else:
                    skipped_count += 1


        if not documents_to_add:
            print(
                "✅ All data already exists in ChromaDB. No new documents to add."
            )
            return

        # Batch insert documents
        print(f"⏳ Adding {len(documents_to_add)} new documents to ChromaDB...")
        try:
            # Use add directly with lists of documents, metadatas, and ids
            vectorstore.add_texts(
                texts=documents_to_add,
                metadatas=metadatas_to_add,
                ids=ids_to_add
            )
            vectorstore.persist() # Ensure persistence after adding

            print(f"✅ Successfully processed {processed_count} new entries")
            print(f"⏩ Skipped {skipped_count} existing entries")
            # Recalculate total documents after adding
            final_total_docs = vectorstore.get(limit=10000).get("ids", [])
            print(
                f"📚 Total documents in ChromaDB: {len(final_total_docs)}"
            )

        except Exception as e:
            print(f"❌ Error adding documents to ChromaDB: {e}")
            return

    print("🎉 Data ingestion completed successfully!")


if __name__ == "__main__":
    main()
