TelecomStock

## 🚀 Quick Deployment

### Deploy to Render (Recommended)

1. **Fork this repository** to your GitHub account
2. **Connect to Render**: Go to [Render Dashboard](https://dashboard.render.com) → "New" → "Blueprint"
3. **Select your repository** and Render will automatically deploy:
   - PostgreSQL database
   - Node.js API service  
   - React frontend as static site

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Local Development

1. Clone the repository
2. Run `npm run start` or `npm run dev:full` 
3. The application will start with automatic SSL certificate generation

## Features

- Full-stack inventory management system
- Real-time updates with WebSocket
- React frontend with TypeScript
- Express.js API with TypeORM
- PostgreSQL database
- Mobile-friendly responsive design

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeORM + PostgreSQL
- **Real-time**: Socket.IO for live updates
- **Deployment**: Render-ready with Blueprint configuration
