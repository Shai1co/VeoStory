<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Veo Visual Novel - AI-Powered Interactive Stories

Transform your ideas into interactive video adventures powered by cutting-edge AI models. This app uses Google's Veo for video generation and Gemini for story choices, creating a unique visual novel experience.

## 🌐 Live Demo

**[Launch the App →](https://Shai1co.github.io/VeoStory/)**

_Note: You'll need to provide your own API keys to use the app (see below)._

> 🔧 **First-time setup:** Make sure GitHub Pages is set to "GitHub Actions" in your repo settings!

## ✨ Features

- 🎬 **AI Video Generation** - Multiple models: Google Veo, Replicate Wan/Veo, Runway Gen-3/4
- 🖼️ **Image Generation** - FLUX Schnell (Replicate) or Gemini Imagen 3
- 📖 **Dynamic Story Choices** - AI-generated branching narratives
- 💾 **Local Storage** - Your stories are saved in your browser
- 🎨 **Style Presets** - Sci-fi, fantasy, noir, anime, and more
- 🎥 **Video Export** - Export your story as a complete video
- ⌨️ **Keyboard Shortcuts** - Fast navigation and control

## 🚀 Quick Start

### Option 1: Use the Hosted Version

1. Visit the [live demo](https://Shai1co.github.io/VeoStory/)
2. Click the **key icon** 🔑 in the header
3. Enter your API keys (see "Getting API Keys" below)
4. Start creating!

### Option 2: Run Locally

**Prerequisites:** Node.js 18+

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shai1co/VeoStory.git
   cd VeoStory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

5. **Configure API keys** in the app UI (click the key icon)

## 🔑 Getting API Keys

### Required: Google AI (Gemini)

**Purpose:** Video generation (Veo), image generation (Imagen), story choices  
**Cost:** Free tier available, pay-as-you-go after  

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy your key (starts with `AIza...`)

[📖 Gemini API Documentation](https://ai.google.dev/gemini-api/docs/api-key)

### Optional: Replicate

**Purpose:** Additional video models (Wan, Veo) and FLUX image generation  
**Cost:** Pay-per-use (~$0.10-0.30 per video)

1. Sign up at [Replicate](https://replicate.com/)
2. Go to [Account Settings → API Tokens](https://replicate.com/account/api-tokens)
3. Copy your token (starts with `r8_...`)

[📖 Replicate API Documentation](https://replicate.com/docs/reference/http)

### Optional: Runway ML

**Purpose:** Runway Gen-3 and Gen-4 video models  
**Cost:** Pay-per-use (~$0.05-0.10 per second of video)

1. Sign up at [Runway](https://app.runwayml.com/)
2. Go to [Settings → API Keys](https://app.runwayml.com/settings/api-keys)
3. Create and copy your key

[📖 Runway API Documentation](https://docs.runwayml.com/reference/authentication)

### Optional: Stability AI

**Purpose:** Stable Diffusion image and Stable Video Diffusion models  
**Cost:** Pay-per-use (~$0.01-0.05 per image)

1. Sign up at [Stability AI](https://platform.stability.ai/)
2. Go to [Account → API Keys](https://platform.stability.ai/account/keys)
3. Create and copy your key (starts with `sk-...`)

[📖 Stability AI Documentation](https://platform.stability.ai/docs/getting-started/authentication)

## 💰 Cost Estimates

| Provider | Model | Cost per Generation | Notes |
|----------|-------|---------------------|-------|
| **Google (Veo)** | Veo 3.1 Fast | ~$0.08-0.12 | 5s video, 720p |
| **Google (Imagen)** | Imagen 3 | Free tier available | Image generation |
| **Replicate** | Wan 2.5 Fast | ~$0.04-0.06 | 5s video |
| **Replicate** | FLUX Schnell | ~$0.003/image | Fast image generation |
| **Runway** | Gen-3 Alpha | ~$0.05/second | High quality |

> 💡 **Tip:** Start with Google Gemini (free tier) + Imagen 3 to explore the app with minimal costs!

## 📦 Deploy Your Own

Want to host your own version? It's easy with GitHub Pages!

### Deploy to GitHub Pages

1. **Fork this repository**

2. **Enable GitHub Pages:**
   - Go to your repo → Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` / root
   - Save

3. **Push to main branch** - The GitHub Action will automatically build and deploy

4. **Access your site:**
   ```
   https://Shai1co.github.io/VeoStory/
   ```

### Deploy to Netlify/Vercel

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Shai1co/VeoStory)

Or for Vercel:
```bash
npm install -g vercel
vercel
```

## 🛡️ Privacy & Security

- ✅ **API keys are stored locally** in your browser's localStorage
- ✅ **No backend server** - all processing happens in your browser
- ✅ **Keys never leave your device** except to call the respective APIs
- ✅ **Your stories are saved locally** in IndexedDB
- ⚠️ **Clear your keys** before using a shared/public computer

## 🎮 Usage

1. **Start a new story** - Enter a prompt and choose a style preset
2. **Review the generated image** - Retry if needed
3. **Accept to generate video** - First scene comes to life
4. **Make a choice** - AI generates 3 options based on the story
5. **Continue your adventure** - Each choice generates a new video
6. **Export** - Save as JSON (story data) or MP4 (video)

### Keyboard Shortcuts

- `S` - Toggle story timeline
- `M` - Toggle mute
- `?` - Show keyboard shortcuts
- `↑/↓` - Navigate segments
- `1/2/3` - Select choices
- `Esc` - Close dialogs

## 🏗️ Technical Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Video Processing:** FFmpeg.wasm
- **AI APIs:** Google AI, Replicate, Runway, Stability AI
- **Storage:** IndexedDB (local)
- **Styling:** Tailwind CSS
- **Deployment:** GitHub Pages (static hosting)

## 🐛 Troubleshooting

### "API Key not set" error
- Make sure you've configured your API keys (click the key icon 🔑)
- For Google APIs, ensure your key has Gemini API enabled

### Video generation fails
- Check your API key is valid
- Verify you have credits/quota remaining
- Try a different model if available

### FFmpeg loading issues
- Disable ad blockers
- Check network connectivity
- Refresh the page

## 📄 License

MIT License - feel free to use, modify, and distribute!

## 🙏 Acknowledgments

- Google AI for Veo and Gemini APIs
- Replicate for easy model access
- Runway ML for Gen-3/4 models
- Stability AI for Stable Diffusion
- FFmpeg team for video processing

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

**Made with ❤️ using Google Veo and Gemini**
