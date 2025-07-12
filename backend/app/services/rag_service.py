from dotenv import load_dotenv
from langchain_google_genai import (
    ChatGoogleGenerativeAI,
    GoogleGenerativeAIEmbeddings,
)
from langchain.prompts import PromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_chroma import Chroma
import chromadb
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
from google.api_core.exceptions import ResourceExhausted

load_dotenv()


class RAGService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            temperature=0.2,
        )

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-exp-03-07"
        )

        self.client = chromadb.PersistentClient(path="instance/chroma")
        self.vector_store = Chroma(
            client=self.client,
            collection_name="balances",
            embedding_function=self.embeddings,
        )

        self.prompt = PromptTemplate.from_template(
            """You are a senior financial analyst.
Use ONLY the context to answer the user.
Context:
{context}
---
Question: {question}"""
        )

        self.qa_chain = create_stuff_documents_chain(self.llm, self.prompt)

    def get_retriever(self, allowed_company_ids: list[str]):
        return self.vector_store.as_retriever(
            search_kwargs={
                "k": 6,
                "filter": {"company": {"$in": allowed_company_ids}},
            }
        )

    def make_rag_chain(self, retriever):
        return create_retrieval_chain(retriever, self.qa_chain)

    @retry(
        reraise=True,
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(ResourceExhausted),
    )
    def answer(
        self,
        user_question: str,
        allowed_company_ids: list[str],
        chat_history: list = None,
    ):
        try:
            retriever = self.get_retriever(allowed_company_ids)
            chain = self.make_rag_chain(retriever)

            result = chain.invoke(
                {"input": user_question, "chat_history": chat_history or []}
            )

            return result["answer"]
        except Exception as e:
            raise Exception(f"RAG pipeline error: {str(e)}")
