# Deploying TelecomStock to Render

This guide explains how to deploy the TelecomStock application to Render.

## Overview

TelecomStock is a full-stack application with:
- **Frontend**: React/Vite application (Static Site)
- **Backend**: Node.js/Express API with TypeORM
- **Database**: PostgreSQL

## Deployment Options

### Option 1: Using render.yaml (Recommended)

1. **Fork/Clone this repository** to your GitHub account

2. **Connect to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository with TelecomStock

3. **Render will automatically**:
   - Create a PostgreSQL database
   - Deploy the API as a Web Service
   - Deploy the frontend as a Static Site
   - Configure environment variables

### Option 2: Manual Deployment

#### Deploy Database
1. Go to Render Dashboard → "New" → "PostgreSQL"
2. Name: `telecomstock-db`
3. Database Name: `telecomstock`
4. User: `admin`
5. Note the connection details

#### Deploy API
1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your repository
3. **Build Settings**:
   - Build Command: `cd api && npm install && npm run build`
   - Start Command: `cd api && npm run start:prod`
4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=[your database host]
   DB_PORT=5432
   DB_USER=admin
   DB_PASSWORD=[your database password]
   DB_NAME=telecomstock
   JWT_SECRET=[generate a secure secret]
   ```

#### Deploy Frontend
1. Go to Render Dashboard → "New" → "Static Site"
2. Connect your repository
3. **Build Settings**:
   - Build Command: `npm install && npm run build:prod`
   - Publish Directory: `./dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=[your API service URL]
   ```

## Environment Variables

### API Environment Variables
- `NODE_ENV`: Set to `production`
- `PORT`: Port for the API (default: 3000)
- `DB_HOST`: Database hostname
- `DB_PORT`: Database port (default: 5432)
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET`: Secret for JWT tokens (generate a secure one)
- `FRONTEND_URL`: Frontend URL for CORS (optional)

### Frontend Environment Variables
- `VITE_API_URL`: URL of your deployed API

## Important Notes

### Database Initialization
The first time you deploy, you may need to initialize the database with some default data. The API will automatically create tables due to TypeORM synchronization in development mode.

### SSL/HTTPS
- Render automatically handles SSL termination
- The API runs on HTTP internally but is accessible via HTTPS
- No SSL certificates needed in your application code

### CORS Configuration
The production API is configured to allow:
- Requests from your Render frontend domain
- Any HTTPS requests
- Proper CORS headers for all allowed origins

### File Structure for Production
```
TelecomStock/
├── api/                    # Backend API
│   ├── src/
│   │   ├── index.prod.ts  # Production entry point
│   │   └── ...
│   ├── Dockerfile.prod    # Production Dockerfile
│   └── package.json
├── src/                   # Frontend source
├── vite.config.prod.ts    # Production Vite config
├── render.yaml           # Render Blueprint
└── package.json
```

## Troubleshooting

### Build Failures
- Check that all dependencies are in `package.json`
- Ensure TypeScript builds without errors
- Verify environment variables are set correctly

### Database Connection Issues
- Verify database credentials in environment variables
- Check that the database service is running
- Ensure the API can reach the database (network connectivity)

### CORS Issues
- Verify `FRONTEND_URL` environment variable in API
- Check that your frontend domain is allowed in CORS configuration
- Ensure cookies/credentials are handled properly

### API Connection Issues
- Verify `VITE_API_URL` points to your deployed API
- Check that the API service is running and accessible
- Test API endpoints directly using the health check: `/health`

## Health Checks

The API includes health check endpoints:
- `GET /health`: Basic health status
- `GET /`: API status and available endpoints
- `GET /test`: Connection test endpoint

## Support

For deployment issues:
1. Check Render service logs
2. Verify environment variables
3. Test database connectivity
4. Check API health endpoints