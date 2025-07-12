import pandas as pd
import sqlite3
from typing import List, Dict
from .rag_service import RAGService


class EmbeddingService:
    def __init__(self, rag_service: RAGService):
        self.rag_service = rag_service

    def fetch_balance_sheet_data(self) -> pd.DataFrame:
        """Fetch balance sheet data from SQLite"""
        conn = sqlite3.connect("instance/mvp.db")
        df = pd.read_sql(
            """
            SELECT bse.id, c.name as company, bse.year, 
                   bse.metric_name, bse.value
            FROM balance_sheet_entry bse
            JOIN company c ON bse.company_id = c.id
        """,
            conn,
        )
        conn.close()
        return df

    def row_to_chunk(self, row: pd.Series) -> str:
        """Convert balance sheet row to text chunk"""
        return f"{row.company}, {row.year}, {row.metric_name}: {row.value}"

    def prepare_chunks(
        self, df: pd.DataFrame
    ) -> tuple[List[str], List[str], List[Dict]]:
        """Prepare text chunks, IDs, and metadata for embedding"""
        df["chunk"] = df.apply(self.row_to_chunk, axis=1)

        ids = df["id"].astype(str).tolist()
        documents = df["chunk"].tolist()
        metadatas = df[["company", "year", "metric_name"]].to_dict(
            orient="records"
        )

        return documents, ids, metadatas

    def populate_vector_store(self):
        """Load data from SQLite and populate ChromaDB"""
        df = self.fetch_balance_sheet_data()
        documents, ids, metadatas = self.prepare_chunks(df)

        self.rag_service.vector_store.add_texts(
            texts=documents, ids=ids, metadatas=metadatas
        )

        return len(documents)

    def update_vector_store(self, new_data: pd.DataFrame):
        """Update vector store with new balance sheet entries"""
        documents, ids, metadatas = self.prepare_chunks(new_data)

        self.rag_service.vector_store.add_texts(
            texts=documents, ids=ids, metadatas=metadatas
        )
