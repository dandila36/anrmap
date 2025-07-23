# 🚀 Deployment Guide

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dandila36/anrmap)

## 📋 Prerequisites

1. **Last.fm API Key**: Get your free API key from [Last.fm API](https://www.last.fm/api/account/create)
2. **GitHub Account**: For code repository
3. **Vercel Account**: For hosting ([vercel.com](https://vercel.com))

## 🔧 Environment Variables

Set these in your Vercel dashboard:

```bash
LASTFM_API_KEY=your_lastfm_api_key_here
LASTFM_SHARED_SECRET=your_lastfm_shared_secret_here  
NODE_ENV=production
```

## 🚀 Deploy Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/dandila36/anrmap.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" 
3. Import your `anrmap` repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Add your environment variables:
   - `LASTFM_API_KEY`: Your Last.fm API key
   - `LASTFM_SHARED_SECRET`: Your Last.fm shared secret
   - `NODE_ENV`: `production`
6. Click "Deploy"

### 3. Access Your App
- Your app will be available at: `https://your-project-name.vercel.app`
- API endpoints will be at: `https://your-project-name.vercel.app/api/*`

## 🎯 Features Available After Deployment

✅ **Full Artist Network Mapping**  
✅ **Real-time Last.fm Data**  
✅ **Interactive Graph & List Views**  
✅ **Spotify & Last.fm Links**  
✅ **CSV Export**  
✅ **Responsive Design**  
✅ **Global CDN (Fast worldwide)**  

## 🔍 Troubleshooting

### Common Issues:

1. **"API Key not found"**
   - Check your environment variables in Vercel dashboard
   - Make sure `LASTFM_API_KEY` is set correctly

2. **"CORS errors"**
   - The app is configured for production domains
   - Should work automatically on Vercel

3. **"Slow API responses"**
   - First request may be slower (cold start)
   - Subsequent requests will be faster

### Vercel-Specific Notes:

- **Function Timeout**: 30 seconds max (configured in `vercel.json`)
- **Memory**: Optimized for serverless functions
- **Caching**: In-memory cache (Redis optional)

## 🛠️ Local Development

If you want to run locally:

```bash
# Install dependencies
npm run install:all

# Start development
npm run dev
```

## 📊 Performance

- **Global CDN**: Sub-second load times worldwide
- **Serverless**: Auto-scaling based on traffic  
- **Optimized**: Lazy loading and caching
- **Mobile-First**: Responsive design

## 🔐 Security

- **API Keys**: Stored securely in Vercel environment
- **HTTPS**: Automatic SSL/TLS encryption
- **CORS**: Configured for production domains
- **Rate Limiting**: Built-in protection

## 📞 Support

If you encounter issues:
1. Check the Vercel deployment logs
2. Verify your Last.fm API key is valid
3. Ensure all environment variables are set

---

**Ready to explore music networks! 🎵** 