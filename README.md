# FairLens

**Google Solution Challenge 2026**

FairLens is an AI bias detection and mitigation platform. The application provides a backend API for uploading datasets, performing fairness analysis using Fairlearn/AIF360, generating AI-driven audit reports via Gemini 1.5 Flash, and applying debiasing techniques.

## Project Structure
- `backend/`: FastAPI application code (routers, schemas, services).
- `datasets/`: Sample CSV datasets for testing.
- `docker-compose.yml`: For containerized local development.

## Setup & Local Development

1. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Gemini API key.
   ```bash
   cp .env.example .env
   ```

2. **Docker Setup**:
   Start the backend using Docker Compose:
   ```bash
   docker-compose up --build
   ```
   The API will be available at `http://localhost:8080`.
   API Documentation is available at `http://localhost:8080/docs`.

3. **Running Tests**:
   To smoke-test the backend, ensure the server is running and execute:
   ```bash
   bash backend/test_endpoints.sh
   ```
