# 🍔 Foodle Frontend

React/TypeScript frontend for the Foodle food discovery application.

## Features

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Google Maps Integration** - Interactive restaurant location display
- **Real-time Updates** - Socket.IO client for live features
- **Responsive Design** - Works on desktop and mobile devices
- **User Authentication** - Sign up, sign in, and Google OAuth

## Quick Start

### Prerequisites
- Node.js 14+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file** with your configuration:
   ```env
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   REACT_APP_API_URL=http://localhost:5000
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

The application will open at `http://localhost:3001`

## Deployment

This frontend is configured to deploy to Vercel:

1. Push code to GitHub (separate repository: `Foodle-Frontend`)
2. Connect Vercel to your GitHub repository
3. Set environment variable: `REACT_APP_API_URL=https://your-backend-url.onrender.com`
4. Deploy!

Vercel automatically handles builds, deploys, and provides a free domain with HTTPS.

## Environment Variables

- `REACT_APP_GOOGLE_MAPS_API_KEY` - Google Maps API key (required)
- `REACT_APP_API_URL` - Backend API URL (defaults to localhost:5000)

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)

## Technologies

- React 18
- TypeScript
- Tailwind CSS
- React Router v6
- Axios
- Socket.IO Client
- Google Maps API
