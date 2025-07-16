# backend/ai_model.py

import os
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain.chains import RetrievalQA # No longer directly used
from langchain_core.prompts import PromptTemplate
from pypdf import PdfReader
import re

# Imports for conversational memory and advanced RAG chain
from langchain.memory import ConversationBufferMemory
# Corrected imports for create_stuff_documents_chain and create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.retrieval import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder


# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define the path for ChromaDB persistent storage
CHROMA_DB_PATH = "./chroma_db"

# Global instances (initialized once)
_llm = None
_embeddings = None
_vectorstore = None
_memory_store = {} # Global dictionary to store chat history per user ID

def initialize_ai_components():
    """
    Initializes Google Gemini LLM and embeddings, and sets up the ChromaDB vectorstore.
    This function should be called once at application startup.
    """
    global _llm, _embeddings, _vectorstore

    gemini_api_key = "AIzaSyDFvKaA5hYFIJMhZiep2l0ot9o_dT5twXo"
    if not gemini_api_key:
        logger.error("GEMINI_API_KEY environment variable not set. AI components cannot be initialized.")
        raise ValueError("GEMINI_API_KEY is not set. Please configure your environment variables.")

    if _llm is None:
        try:
            _llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=gemini_api_key, temperature=0.2)
            logger.info("Google Gemini LLM (gemini-1.5-pro) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Gemini LLM: {e}")
            _llm = None
            raise # Re-raise to prevent app from starting with broken AI

    if _embeddings is None:
        try:
            _embeddings = GoogleGenerativeAIEmbeddings(model="embedding-001", google_api_key=gemini_api_key)
            logger.info("Google Gemini Embeddings (embedding-001) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Gemini Embeddings: {e}")
            _embeddings = None
            raise # Re-raise to prevent app from starting with broken AI

    if _llm and _embeddings and _vectorstore is None:
        try:
            os.makedirs(CHROMA_DB_PATH, exist_ok=True)
            _vectorstore = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=_embeddings)
            logger.info(f"ChromaDB vectorstore initialized/loaded from {CHROMA_DB_PATH}.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB vectorstore: {e}")
            _vectorstore = None
            raise # Re-raise to prevent app from starting with broken AI

    return _llm, _embeddings

def load_pdf_to_vectorstore(pdf_path, company_id, year, db_session, models):
    """
    Loads text from a PDF, chunks it, and adds it to the ChromaDB vector store.
    Metadata includes company_id and year for filtering.
    """
    global _vectorstore, _embeddings

    if _embeddings is None:
        logger.error("Embeddings not initialized. Cannot load PDF to vector store.")
        return

    if _vectorstore is None:
        try:
            _vectorstore = Chroma(persist_directory=CHROMA_DB_PATH, embedding_function=_embeddings)
            logger.info(f"Re-initialized ChromaDB vectorstore from {CHROMA_DB_PATH}.")
        except Exception as e:
            logger.error(f"Failed to re-initialize ChromaDB vectorstore: {e}")
            return

    try:
        reader = PdfReader(pdf_path)
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"

        if not full_text.strip():
            logger.warning(f"No text extracted from PDF: {pdf_path}")
            return

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )
        texts = text_splitter.create_documents([full_text])

        for doc in texts:
            doc.metadata = {
                "company_id": company_id,
                "year": year,
                "source": f"BalanceSheet_{company_id}_{year}.pdf"
            }

        _vectorstore.add_documents(texts)
        _vectorstore.persist()
        logger.info(f"Successfully loaded {len(texts)} chunks from {pdf_path} into vector store.")

    except Exception as e:
        logger.error(f"Error loading PDF {pdf_path} to vector store: {e}")


def delete_vectors_for_balance_sheet(company_id, year):
    """
    Deletes all vectors associated with a specific company_id and year from ChromaDB.
    """
    global _vectorstore

    if _vectorstore is None:
        logger.warning("ChromaDB vectorstore not initialized. Cannot delete vectors.")
        return

    try:
        deleted_ids = _vectorstore.delete(
            where={"company_id": company_id, "year": year}
        )
        _vectorstore.persist()
        logger.info(f"Deleted vectors for company_id={company_id}, year={year}. Deleted IDs: {deleted_ids}")
    except Exception as e:
        logger.error(f"Error deleting vectors for company_id={company_id}, year={year}: {e}")


def extract_financial_data_from_pdf(pdf_path):
    """
    Extracts full text and attempts to parse key financial metrics from a PDF.
    """
    try:
        reader = PdfReader(pdf_path)
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"

        if not full_text.strip():
            logger.warning(f"No text extracted from PDF for financial data extraction: {pdf_path}")
            return {"full_text": ""}

        extracted_data = {
            "full_text": full_text,
            "revenue": None,
            "net_income": None,
            "assets": None,
            "liabilities": None
        }

        def find_value_near_keyword(text, keywords, regex_pattern=r'(\d[\d,\.]*\d|\d+)', look_around=100):
            text_lower = text.lower()
            for keyword in keywords:
                for match in re.finditer(re.escape(keyword.lower()), text_lower):
                    start_idx = max(0, match.start() - look_around)
                    end_idx = min(len(text), match.end() + look_around)
                    context = text[start_idx:end_idx]
                    numbers = re.findall(regex_pattern, context)
                    if numbers:
                        for num_str in numbers:
                            cleaned_num_str = num_str.replace(',', '')
                            try:
                                return float(cleaned_num_str)
                            except ValueError:
                                continue
            return None

        extracted_data["revenue"] = find_value_near_keyword(full_text, ["revenue", "total revenue", "sales"])
        extracted_data["net_income"] = find_value_near_keyword(full_text, ["net income", "profit after tax", "net profit"])
        extracted_data["assets"] = find_value_near_keyword(full_text, ["total assets", "assets, total"])
        extracted_data["liabilities"] = find_value_near_keyword(full_text, ["total liabilities", "liabilities, total"])

        logger.info(f"Extracted financial data: {extracted_data}")
        return extracted_data

    except Exception as e:
        logger.error(f"Error extracting financial data from PDF {pdf_path}: {e}")
        return {"full_text": ""}


def generate_chat_response(user_query, company_id, llm_instance, embeddings_instance, db_session, models):
    """
    Generates a chat response using RAG, filtered by company_id, with conversational memory.
    """
    global _memory_store # Access the global memory store

    if llm_instance is None or embeddings_instance is None:
        logger.error("LLM or Embeddings not initialized. Cannot generate chat response.")
        return "AI components are not ready. Please try again later."

    if _vectorstore is None:
        logger.error("Vector store not initialized. Cannot perform RAG.")
        return "Vector database is not ready. Please upload balance sheets."

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
            f"You have access to balance sheet data for company ID {company_id}. "
            "Use the provided context to answer questions about financial metrics, trends, and insights. "
            "Be precise, analytical, and provide specific numbers from the data when available. "
            "If you cannot find relevant information in the context, clearly state that. "
            "Keep your responses concise but informative.\n\n"
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

        memory.save_context({"input": user_query}, {"answer": response["answer"]})

        response_text = response.get("answer", "I cannot answer this question based on the available financial data.")
        source_docs = response.get("context", [])

        if source_docs:
            source_info = "\n\nSources:"
            unique_sources = set()
            for doc in source_docs:
                if 'source' in doc.metadata:
                    unique_sources.add(doc.metadata['source'])
            if unique_sources:
                source_info += "\n" + ", ".join(list(unique_sources))
                response_text += source_info

        return response_text

    except Exception as e:
        logger.error(f"Error generating chat response for company_id {company_id}: {e}")
        return f"An internal error occurred while processing your request: {str(e)}"

