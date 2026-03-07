# HR Analytics Backend

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB instance.
3. Install dependencies:
   - `npm install`
4. Start server:
   - `npm run dev`

Server runs at `http://localhost:4000` by default.

## API

- `GET /api/health`
- `GET /api/analytics/bootstrap`
- `POST /api/analytics/dataset/upload` (multipart form-data, field: `file`)
- `DELETE /api/analytics/dataset`

## Required Dataset Columns

`Employee_ID, Department, JobRole, Age, MonthlyIncome, PerformanceRating, JobSatisfaction, Attrition`

Accepted file types: `.csv`, `.xlsx`, `.xls`
