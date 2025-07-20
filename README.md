# Oculis: AI Financial Assistant - Quickstart Guide

Welcome to **Oculis**, an AI-powered financial assistant designed to help users analyze and query financial data for various companies.  
This project demonstrates a **Retrieval-Augmented Generation (RAG)** system, allowing you to upload balance sheet data and ask natural language questions about it.

> [!IMPORTANT]
> The web app is publicly hosted at [https://oculis.vercel.app](https://oculis.vercel.app).  
> The login credentials are available at [https://tanvincible.github.io/oculis](https://tanvincible.github.io/oculis). 

This README provides a quickstart guide to get **Oculis** up and running on your local machine in a few easy steps.

> [!NOTE]  
> This project is a **take-home** assignment for an internship recruitment.  
> The **project** report is at [oculis-report.pdf](https://github.com/tanvincible/oculis/blob/main/oculis-report.pdf).  
> The **presentation** is available at [oculis-ppt.pdf](https://github.com/tanvincible/oculis/blob/main/oculis-ppt.pdf).

## Features

- **User Authentication**: Secure login system for accessing the application.
- **Company Management**: Create and manage different companies to associate financial data with.
- **Financial Data Upload**: Easily upload balance sheet data for different companies in CSV or Excel format. The system intelligently extracts data for multiple years from a single file. A `sample.csv` is included for testing.
- **AI-Powered Chat**: Ask natural language questions about the uploaded financial data.
- **Contextual Understanding**: The AI uses a RAG pipeline to provide accurate answers based only on the provided financial documents, minimizing hallucinations.
- **Financial Charts**: (Potentially) Visualize financial trends and metrics.
- **Intuitive User Interface**: A clean and responsive chat interface built with React and Tailwind CSS.

## Technologies Used

### Backend (Python - Flask)
- Flask: Web framework for API endpoints.
- Flask-SQLAlchemy: ORM for database interactions.
- Flask-Migrate: For database migrations.
- Flask-JWT-Extended: For handling JSON Web Tokens (authentication).
- SQLite: File-based database (`site.db`) for storing data.
- Pandas: Data manipulation for CSV/Excel files.
- LangChain: Framework for building LLM applications (RAG pipeline, memory, chaining).
- ChromaDB: Vector store for document embeddings.
- Google Generative AI (Gemini API): LLM used for understanding queries and generating responses.

### Frontend (React)
- React: JavaScript library for building UIs.
- React Router DOM: For client-side routing.
- Tailwind CSS: Utility-first CSS framework.
- React Icons: UI icons.
- Vite: Frontend build tool.

## Prerequisites

Make sure you have:
- Python 3.9+
- Node.js & npm (or Yarn)
- Git
- Google Cloud Project with Gemini API enabled (API Key)

## Setup Guide

### 1. Clone the Repository

```bash
git clone <repository_url>
cd oculis
```

### 2. Backend Setup

```bash
cd backend
```

#### a. Create a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows
```

#### b. Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### c. Configure Environment Variables

Create `.env` in the root:

```env
GOOGLE_API_KEY='YOUR_GEMINI_API_KEY'
```

#### d. Initialize and Seed Database

Inside `backend`, run the following

```bash
export FLASK_APP='app:create_app'
python -m flask seed-db 
```

If you want to re-seed the database, run

```bash
python -m flask seed-db --force
```

### 3. Frontend Setup

```bash
cd ../frontend
```

#### Install Node.js Dependencies

```bash
npm install
```

## Running the Application

### 1. Backend

```bash
python app.py
```

Server will run on `http://127.0.0.1:5000`.

### 2. Frontend

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`.

## Using Oculis

* **Login** using credentials from the [docs/](https://tanvincible.github.io/oculis) directory.
* **Select a Company** or create a new one.
* **Upload Financial Data** via the Dashboard.
* **Chat with AI** with queries like:
  * "What was the revenue for 2023?"
  * "Total liabilities in 2025?"
  * "Compare net income between 2022 and 2024."
* **Clear Chat** with the button provided.
* **Explore Features** like charts and user management.

## Key Design Decisions

* **RAG Architecture** minimizes hallucinations.
* **Granular Chunking** with rich metadata enables precise retrieval.
* **Separation of Concerns** between frontend and backend.
* **Conversational Memory** via LangChain enables contextual chats.
* **Streamlined UX** with intuitive uploads and clear UI states.

## Future Enhancements

* Advanced Data Visualization
* Complex Query Handling
* Real-time Data Integration
* Scalability Improvements
* Comprehensive Error Handling

## LICENSE

MIT

Thank you for exploring Oculis!
