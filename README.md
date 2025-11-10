<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1dBLy9AuK4SR1jEmIprwnJ14U5GWWiFFN

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file in the project root and add your API keys:

   ```bash
   # Google Veo (Gemini)
   GEMINI_API_KEY=your_gemini_api_key

   # Runway ML (optional)
   RUNWAY_API_KEY=your_runway_api_key

   # Stability AI - Stable Video Diffusion (optional)
   STABILITY_API_KEY=your_stability_api_key
   ```

   Notes:
   - Veo is required to start a brand‑new story (text‑to‑video).
   - Runway supports both text‑to‑video and image‑to‑video.
   - Stable Video Diffusion supports image‑to‑video only (2‑second clips).

3. Run the app:
   `npm run dev`

### Provider Availability

The model selector shows a “No API Key” badge for providers missing keys. Keys are injected via Vite (`vite.config.ts`) into `process.env.*`.
