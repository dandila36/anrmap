# 🎵 Similar Artists Mapper (ANRMap)

**Interactive network visualization of musically similar artists powered by Last.fm**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dandila36/anrmap)

![Similar Artists Mapper](https://img.shields.io/badge/status-production%20ready-brightgreen) ![Last.fm](https://img.shields.io/badge/powered%20by-Last.fm-red) ![License](https://img.shields.io/badge/license-MIT-blue) ![Vercel](https://img.shields.io/badge/deploy-vercel-black)

Transform any artist into a beautiful, interactive network of musical connections. Discover new music through visual exploration of artist relationships, powered by real Last.fm data.

## ✨ Features

### 🎨 **Dual View Modes**
- **🕸️ Interactive Graph**: Beautiful network visualization with Cytoscape.js
- **📋 List View**: Sortable table with direct Spotify/Last.fm links

### 🔍 **Smart Discovery**  
- **Multi-hop networks**: Explore 1-hop (direct) and 2-hop (indirect) connections
- **Real-time Last.fm data**: Always up-to-date similarity scores and artist info
- **Genre-based coloring**: Visual clustering by musical style
- **Popularity-based sizing**: Bigger nodes = more listeners

### 🎛️ **Advanced Features**
- **Artist expansion**: Double-click any artist to explore their network  
- **Smart filtering**: By genre, similarity score, and network depth
- **Multiple exports**: CSV data + PNG images
- **Spotify integration**: Direct links to search artists on Spotify
- **Last.fm integration**: Direct links to artist profiles
- **Mobile responsive**: Works perfectly on all devices

### ⚡ **Performance & Reliability**
- **Smart caching**: 24-hour TTL with Redis or in-memory fallback
- **Rate limiting**: Intelligent queuing respects API limits
- **Error handling**: Graceful fallbacks and user-friendly messages
- **Production ready**: Optimized for 100+ artist networks

## 🚀 Quick Start

### 🌐 **Deploy to Production (Recommended)**

The fastest way to get started is to deploy directly to Vercel:

1. **One-Click Deploy**: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dandila36/anrmap)

2. **Add Environment Variables** in Vercel dashboard:
   ```bash
   LASTFM_API_KEY=your_lastfm_api_key_here
   LASTFM_SHARED_SECRET=your_lastfm_shared_secret_here
   NODE_ENV=production
   ```

3. **Get Last.fm API Key**: [Create free account](https://www.last.fm/api/account/create)

📖 **Full deployment guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### 🛠️ **Local Development**

#### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis (optional, falls back to in-memory cache)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/similar-artists-mapper.git
   cd similar-artists-mapper
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment**
   ```bash
   cp backend/config.env.example backend/.env
   # Edit backend/.env with your settings
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start all services (includes Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t similar-artists-mapper .

# Run with environment variables
docker run -p 3001:3001 \
  -e LASTFM_API_KEY=your_api_key \
  -e LASTFM_SHARED_SECRET=your_secret \
  -e REDIS_URL=redis://your-redis:6379 \
  similar-artists-mapper
```

## 🎵 Usage Guide

### Basic Usage

1. **Enter an Artist**: Paste a Last.fm URL like `https://www.last.fm/music/Billie+Eilish` or simply type "Billie Eilish"

2. **Configure Options**: 
   - Choose network depth (1-hop or 2-hop)
   - Set the number of similar artists (10-50)

3. **Explore the Network**:
   - Hover over nodes to see artist details
   - Click nodes to view full information in the side panel
   - Drag to pan, scroll to zoom

4. **Expand the Network**: Click "Add Similar Artists" in the side panel to grow your network

5. **Filter Results**: Use the toolbar to filter by similarity score or genre

6. **Export Your Discovery**: Download as PNG for presentations or CSV for data analysis

### Advanced Features

#### Filters
- **Similarity Threshold**: Show only connections above a certain similarity score
- **Genre Filter**: Focus on specific musical genres
- **Network Depth**: Control how many "hops" from the original artist

#### Export Options
- **PNG Export**: High-resolution image suitable for presentations
- **CSV Export**: Raw data with artist details and connection strengths

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Cytoscape.js for graph visualization
- Axios for API communication

**Backend**
- Node.js with Fastify
- Redis for caching (optional)
- Rate limiting and error handling
- Last.fm API integration

**Deployment**
- Docker & Docker Compose
- Health checks and monitoring
- Production-ready configuration

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Fastify API    │    │    Last.fm API  │
│                 │────│                 │────│                 │
│ • Cytoscape.js  │    │ • Rate Limiting │    │ • Artist Data   │
│ • Tailwind CSS  │    │ • Redis Cache   │    │ • Similarity    │
│ • TypeScript    │    │ • Error Handling│    │ • Metadata      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 API Documentation

### Core Endpoints

#### Create Artist Map
```http
POST /api/map
Content-Type: application/json

{
  "url": "https://www.last.fm/music/Artist+Name",
  "depth": 1,
  "limit": 25
}
```

#### Expand Node
```http
POST /api/expand
Content-Type: application/json

{
  "artistName": "Artist Name",
  "limit": 25
}
```

#### Export Data
```http
GET /api/export/csv?root=Artist+Name&depth=1&limit=25
```

### Response Format

```json
{
  "success": true,
  "rootArtist": "Billie Eilish",
  "nodes": [
    {
      "id": "Billie Eilish",
      "name": "Billie Eilish",
      "listeners": 43219876,
      "tags": ["pop", "alternative", "indie"],
      "isRoot": true
    }
  ],
  "edges": [
    {
      "source": "Billie Eilish",
      "target": "Clairo",
      "match": 0.85
    }
  ]
}
```

## ⚙️ Configuration

### Environment Variables

```bash
# Backend Configuration
PORT=3001
NODE_ENV=production

# Last.fm API (Required)
LASTFM_API_KEY=your_api_key_here
LASTFM_SHARED_SECRET=your_shared_secret_here

# Redis Cache (Optional)
REDIS_URL=redis://localhost:6379

# Frontend Configuration
VITE_API_URL=/api
```

### Rate Limiting

The application implements intelligent rate limiting:
- Maximum 5 requests per second to Last.fm API
- Request queuing with exponential backoff
- Graceful handling of 429 responses
- User-facing rate limit notifications

## 🎨 Customization

### Graph Styling

Node colors are automatically assigned based on primary genre:

```javascript
const genreColors = {
  pop: '#FF6B6B',
  rock: '#4ECDC4',
  electronic: '#FECA57',
  // ... more genres
};
```

### Adding New Features

The modular architecture makes it easy to extend:

1. **New Filters**: Add to `FilterState` interface and implement in `Toolbar.tsx`
2. **Export Formats**: Create new routes in `backend/src/routes/export.js`
3. **Visualizations**: Extend `GraphCanvas.tsx` with new Cytoscape layouts
4. **Data Sources**: Add new API integrations alongside Last.fm service

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test

# Run integration tests
npm run test:integration
```

## 📊 Performance

### Optimization Features

- **Smart Caching**: 24-hour TTL for API responses
- **Request Batching**: Parallel API calls where possible
- **Graph Optimization**: Efficient layouts for large networks
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: WebP format with fallbacks

### Monitoring

Health check endpoint available at `/healthz`:

```json
{
  "ok": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit using conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your fork and submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Last.fm** for providing the music data API
- **Cytoscape.js** for the excellent graph visualization library
- **Fastify** for the high-performance backend framework
- The open-source community for the amazing tools and libraries

## 📞 Support

- 📧 **Email**: support@similarartists.app
- 💬 **Discord**: [Join our community](https://discord.gg/similar-artists)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/similar-artists-mapper/issues)
- 📖 **Documentation**: [Full API docs](https://docs.similarartists.app)

---

**Built with ❤️ for music discovery** 