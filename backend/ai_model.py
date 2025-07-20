# backend/ai_model.py

import os
import logging
import pandas as pd

# Removed direct import of db, Company, BalanceSheet from models at top level
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

from langchain.memory import ConversationBufferMemory
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from dotenv import load_dotenv
import models


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Define the path for ChromaDB persistent storage
CHROMA_DB_PATH = "./chroma_db"

# Global instances (initialized once)
_llm = None
_embeddings = None
_vectorstore = None
_memory_store = {}


def initialize_ai_components():
    """
    Initializes Google Gemini LLM and embeddings, and sets up the ChromaDB vectorstore.
    This function should be called once at application startup.
    """
    global _llm, _embeddings, _vectorstore

    load_dotenv(
        dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env")
    )

    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        logger.error(
            "GEMINI_API_KEY environment variable not set. AI components cannot be initialized."
        )
        raise ValueError(
            "GEMINI_API_KEY is not set. Please configure your environment variables."
        )

    if _llm is None:
        try:
            _llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-pro",
                google_api_key=gemini_api_key,
                temperature=0.2,
            )
            logger.info(
                "Google Gemini LLM (gemini-1.5-pro) initialized successfully."
            )
        except Exception as e:
            logger.error(f"Failed to initialize Google Gemini LLM: {e}")
            _llm = None
            raise

    if _embeddings is None:
        try:
            _embeddings = GoogleGenerativeAIEmbeddings(
                model="embedding-001", google_api_key=gemini_api_key
            )
            logger.info(
                "Google Gemini Embeddings (embedding-001) initialized successfully."
            )
        except Exception as e:
            logger.error(f"Failed to initialize Google Gemini Embeddings: {e}")
            _embeddings = None
            raise

    if _llm and _embeddings and _vectorstore is None:
        try:
            os.makedirs(CHROMA_DB_PATH, exist_ok=True)
            _vectorstore = Chroma(
                persist_directory=CHROMA_DB_PATH,
                embedding_function=_embeddings,
            )
            logger.info(
                f"ChromaDB vectorstore initialized/loaded from {CHROMA_DB_PATH}."
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB vectorstore: {e}")
            _vectorstore = None
            raise

    return _llm, _embeddings, _vectorstore


def process_structured_financial_data(
    filepath, company_id, embeddings, db_session
):
    """
    Loads financial data from a structured CSV/Excel file, extracts key metrics for ALL years found,
    stores them in the database, and generates text chunks for ChromaDB.
    """
    global _vectorstore

    if embeddings is None:
        logger.error(
            "Embeddings not initialized. Cannot process structured data."
        )
        return None

    if _vectorstore is None:
        try:
            _vectorstore = Chroma(
                persist_directory=CHROMA_DB_PATH, embedding_function=embeddings
            )
            logger.info(
                f"Re-initialized ChromaDB vectorstore from {CHROMA_DB_PATH}."
            )
        except Exception as e:
            logger.error(f"Failed to re-initialize ChromaDB vectorstore: {e}")
            return None

    try:
        file_extension = os.path.splitext(filepath)[1].lower()
        if file_extension == ".csv":
            df = pd.read_csv(filepath)
        elif file_extension == ".xlsx":
            df = pd.read_excel(filepath)
        else:
            logger.error(f"Unsupported file type: {file_extension}")
            return None

        df.set_index("Metric", inplace=True)

        # Identify year columns dynamically
        # Filter out non-numeric/non-year columns (like 'Metric' if it somehow became a column)
        year_columns = [
            col
            for col in df.columns
            if str(col).isdigit() and len(str(col)) == 4
        ]
        if not year_columns:
            logger.warning(f"No valid year columns found in file {filepath}.")
            return {
                "status": "no_years_found",
                "message": "No valid year columns (e.g., 2022) found in the uploaded file.",
            }

        # IMPORT DATABASE MODELS LOCALLY TO AVOID CIRCULAR DEPENDENCY
        from models import BalanceSheet, Company

        company_obj = (
            db_session.query(Company).filter_by(id=company_id).first()
        )
        company_name = (
            company_obj.name if company_obj else f"Company {company_id}"
        )

        all_processed_data = {}
        documents_for_chroma = []

        for year_col in year_columns:
            year = int(year_col)  # Ensure year is an integer

            # First, delete existing vectors for this company and year to prevent duplicates/stale data
            # You need to ensure delete_vectors_for_balance_sheet accepts int for company_id and year
            delete_vectors_for_balance_sheet(company_id)

            # Then, delete existing SQL DB entry for this company and year
            existing_bs_entry = (
                db_session.query(BalanceSheet)
                .filter_by(company_id=company_id, year=year)
                .first()
            )
            if existing_bs_entry:
                db_session.delete(existing_bs_entry)
                db_session.commit()
                logger.info(
                    f"Deleted existing balance sheet entry for Company ID: {company_id}, Year: {year}"
                )

            # Data Extraction for the current year_col
            extracted_revenue = (
                df.loc["Revenue", year_col]
                if year_col in df.columns and "Revenue" in df.index
                else None
            )
            extracted_net_income = (
                df.loc["Net Income", year_col]
                if year_col in df.columns and "Net Income" in df.index
                else None
            )
            extracted_assets = (
                df.loc["Total Assets", year_col]
                if year_col in df.columns and "Total Assets" in df.index
                else None
            )
            extracted_liabilities = (
                df.loc["Total Liabilities", year_col]
                if year_col in df.columns and "Total Liabilities" in df.index
                else None
            )

            # Convert to float, handle non-numeric data
            try:
                extracted_revenue = (
                    float(extracted_revenue)
                    if extracted_revenue is not None
                    else None
                )
            except ValueError:
                extracted_revenue = None
            try:
                extracted_net_income = (
                    float(extracted_net_income)
                    if extracted_net_income is not None
                    else None
                )
            except ValueError:
                extracted_net_income = None
            try:
                extracted_assets = (
                    float(extracted_assets)
                    if extracted_assets is not None
                    else None
                )
            except ValueError:
                extracted_assets = None
            try:
                extracted_liabilities = (
                    float(extracted_liabilities)
                    if extracted_liabilities is not None
                    else None
                )
            except ValueError:
                extracted_liabilities = None

            # Store in SQL Database (BalanceSheet model)
            new_bs_entry = BalanceSheet(
                company_id=company_id,
                year=year,
                revenue=extracted_revenue,
                net_income=extracted_net_income,
                assets=extracted_assets,
                liabilities=extracted_liabilities,
            )
            db_session.add(new_bs_entry)
            db_session.commit()  # Commit after each year's entry
            logger.info(
                f"Stored structured data for company {company_id}, year {year} in SQL DB."
            )

            # Prepare for ChromaDB (RAG)
            financial_metrics = {
                "Revenue": extracted_revenue,
                "Net Income": extracted_net_income,
                "Total Assets": extracted_assets,
                "Total Liabilities": extracted_liabilities,
            }

            for metric_name, metric_value in financial_metrics.items():
                if metric_value is not None:
                    text_content = f"For {company_name}, the {metric_name.lower()} in {year} was {metric_value}."
                    documents_for_chroma.append(
                        Document(
                            page_content=text_content,
                            metadata={
                                "company_id": company_id,
                                "year": year,
                                "metric": metric_name,
                                "value": metric_value,
                                "source": (
                                    f"FinancialData_{company_id}_{year}.csv"
                                    if file_extension == ".csv"
                                    else f"FinancialData_{company_id}_{year}.xlsx"
                                ),
                            },
                        )
                    )

            all_processed_data[year] = {
                "revenue": extracted_revenue,
                "net_income": extracted_net_income,
                "assets": extracted_assets,
                "liabilities": extracted_liabilities,
            }

        if documents_for_chroma:
            _vectorstore.add_documents(documents_for_chroma)
            # _vectorstore.persist()
            logger.info(
                f"Successfully loaded {len(documents_for_chroma)} structured data chunks into vector store for company {company_id} across multiple years."
            )
        else:
            logger.warning(
                f"No valid data points found in file {filepath} for company {company_id} to add to vector store. This might be due to missing expected metrics or year columns."
            )

        return {"status": "success", "processed_years": all_processed_data}

    except Exception as e:
        logger.error(
            f"Error processing structured file {filepath} for company {company_id}: {e}"
        )
        import traceback

        logger.error(traceback.format_exc())
        return {"status": "error", "message": str(e)}


def delete_vectors_for_balance_sheet(company_id):
    global _vectorstore
    if _vectorstore is None:
        logger.warning(
            "ChromaDB vectorstore not initialized. Cannot delete vectors."
        )
        return

    try:
        deleted_ids = _vectorstore.delete(
            where={"company_id": {"$eq": company_id}}
        )
        logger.info(
            f"Deleted vectors for company_id={company_id}. Deleted IDs: {deleted_ids}"
        )
    except Exception as e:
        logger.error(
            f"Error deleting vectors for company_id={company_id}: {e}"
        )


def generate_chat_response(
    user_query,
    company_id,
    llm_instance,
    embeddings_instance,
    db_session,
    models,
):
    """
    Generates a chat response using RAG, filtered by company_id, with conversational memory.
    """
    global _memory_store

    if llm_instance is None or embeddings_instance is None:
        logger.error(
            "LLM or Embeddings not initialized. Cannot generate chat response."
        )
        return "AI components are not ready. Please try again later."

    if _vectorstore is None:
        logger.error("Vector store not initialized. Cannot perform RAG.")
        return "Vector database is not ready. Please upload financial data."

    try:
        memory_key = f"chat_history_company_{company_id}"

        if memory_key not in _memory_store:
            _memory_store[memory_key] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True,
                output_key="answer",
            )
        memory = _memory_store[memory_key]

        retriever = _vectorstore.as_retriever(
            search_kwargs={"k": 5, "filter": {"company_id": company_id}}
        )

        system_prompt = (
            "You are a financial analyst AI assistant specializing in balance sheet analysis. "
            f"You have access to structured financial data for company ID {company_id}. "
            "Use the provided context to answer questions about financial metrics, trends, and insights. "
            "Be precise, analytical, and provide specific numbers from the data when available. "
            "If you cannot find relevant information in the context, clearly state that. "
            "Keep your responses concise but informative. "
            "Only use the information provided in the context.\n\n"
            "Context:\n{context}"
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )

        document_chain = create_stuff_documents_chain(llm_instance, prompt)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        chat_history = memory.chat_memory.messages

        response = retrieval_chain.invoke(
            {"input": user_query, "chat_history": chat_history}
        )

        memory.save_context(
            {"input": user_query}, {"answer": response["answer"]}
        )

        response_text = response.get(
            "answer",
            "I cannot answer this question based on the available financial data.",
        )
        source_docs = response.get("context", [])

        # logger.info(f"Retrieved context documents: {source_docs}")

        if source_docs:
            source_info = "\n\nSources:"
            unique_sources = set()
            for doc in source_docs:
                if "source" in doc.metadata:
                    unique_sources.add(doc.metadata["source"])
            if unique_sources:
                source_info += "\n" + ", ".join(list(unique_sources))
                response_text += source_info

        return response_text

    except Exception as e:
        logger.error(
            f"Error generating chat response for company_id {company_id}: {e}"
        )
        return f"An internal error occurred while processing your request: {str(e)}"
