---
sidebar_position: 3
---

# Running Test-platfrom from Source

This chapter explains how to run Test-platfrom directly from source. The frontend and backend run separately and require a PostgreSQL database.

:::info[Prerequisite]

Prerequisite: v22 or higher node must be installed.

:::

To use Test-platfrom, you need to run both frontend server and backend(API) server.

First, clone the repository.

```bash
git clone https://github.com/moliason/Test-platfrom.git
```

## Run backend server

Place the .env file at `backend/.env`.

```.env title="backend/.env"
FRONTEND_ORIGIN=http://localhost:8000
```

Move to backend directory, then install dependencies.

```bash
cd backend
npm install
```

Build backend code.

```bash
npm run build
```

Initialize the database with the following command.

```bash
npm run migrate
```

Start backend server.

```bash
npm run start
```

## Run frontend server

Move to frontend directory, then install dependencies.

Place the .env file at `frontend/.env`.

```.env title="frontend/.env"
NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8001
```

```bash
cd frontend
npm install
```

Build frontend code

```bash
npm run build
```

Start frontend server

```bash
npm run start
```
