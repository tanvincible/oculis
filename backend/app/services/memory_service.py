from langchain.memory import ConversationBufferWindowMemory
from typing import Dict, List, Tuple


class MemoryService:
    def __init__(self):
        self.user_memories: Dict[int, ConversationBufferWindowMemory] = {}

    def get_memory(self, user_id: int) -> ConversationBufferWindowMemory:
        """Get or create memory for a user"""
        if user_id not in self.user_memories:
            self.user_memories[user_id] = ConversationBufferWindowMemory(
                k=4,  # Keep last 4 turns
                memory_key="chat_history",
                return_messages=True,
            )
        return self.user_memories[user_id]

    def add_exchange(self, user_id: int, question: str, answer: str):
        """Add a question-answer exchange to user's memory"""
        memory = self.get_memory(user_id)
        memory.chat_memory.add_user_message(question)
        memory.chat_memory.add_ai_message(answer)

    def get_chat_history(self, user_id: int) -> List[Tuple[str, str]]:
        """Get formatted chat history for a user"""
        memory = self.get_memory(user_id)
        messages = memory.chat_memory.messages

        history = []
        for i in range(0, len(messages), 2):
            if i + 1 < len(messages):
                history.append((messages[i].content, messages[i + 1].content))

        return history

    def clear_memory(self, user_id: int):
        """Clear memory for a user"""
        if user_id in self.user_memories:
            self.user_memories[user_id].clear()
