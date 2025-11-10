# VeoStory - Quick Start Guide

## 🎮 New Features & How to Use Them

### ⚡✨ Model Selection

**Choose your generation mode:**

VeoStory supports two Veo 3.1 models:

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| **Fast** ⚡ | ~1 minute | Good | Quick prototyping, experimenting with ideas |
| **Standard** ✨ | ~2-3 minutes | Highest | Final production, maximum visual quality |

**How to use:**
- Select your preferred model on the start screen before beginning
- Your choice is saved automatically (persists between sessions)
- See which model is active via the badge in the header (⚡ or ✨)
- Veo and Runway support full text‑to‑video and image‑to‑video. Stable Video Diffusion supports image‑to‑video only.

**💡 Tip:** Start with Fast mode to experiment with your story, then use Standard mode for your final playthrough!

---

### 🔐 Environment Variables

Add these to `.env.local` (only include the providers you plan to use):

```bash
GEMINI_API_KEY=your_gemini_api_key              # Veo 3.1
RUNWAY_API_KEY=your_runway_api_key              # Runway Gen‑3/4
STABILITY_API_KEY=your_stability_api_key        # Stable Video Diffusion
```

Tip: The model selector disables providers without keys and shows a "No API Key" badge.

### 🎹 Keyboard Shortcuts
Press these keys for quick actions:

| Key | Action |
|-----|--------|
| `S` | Toggle story timeline sidebar |
| `?` | Show all keyboard shortcuts |
| `Esc` | Close dialogs and overlays |
| `↑` | Go to previous video segment |
| `↓` | Go to next video segment |
| `1` | Select first choice |
| `2` | Select second choice |
| `3` | Select third choice |
| `Space` | Play/pause current video |

**💡 Tip:** Click the `?` icon in the top-right header to see shortcuts anytime!

---

### 📖 Story Timeline Sidebar

**Open it:** Press `S` or click the arrow button on the left side

**Features:**
- See your entire story path at a glance
- Click any segment to jump back and replay
- Current segment is highlighted in blue
- Shows which segments have choices

**Perfect for:**
- Reviewing your story
- Jumping back to favorite moments
- Seeing how your choices led to the current point

---

### ✨ Enhanced Choices

When you reach a decision point:
- **Keyboard shortcuts:** Press `1`, `2`, or `3` to quickly select
- **Mouse:** Hover to see the subtle glow effect
- **Animation:** Choices appear one by one with a stagger effect

The keyboard shortcut number appears in the top-right of each choice button!

---

### 🎬 Video Segments

**Current video:**
- Full controls visible
- Larger size
- Auto-plays

**Previous videos:**
- Loop silently like a GIF
- Hover to see segment details
- Click to replay that segment

---

### 📍 Jump to Latest Button

When you scroll up through your story:
- A floating button appears in the bottom-right
- Click it to instantly jump back to the latest segment
- Disappears when you're near the bottom

---

### 👋 Welcome Tutorial

**First time users:**
- An introduction modal appears on first visit
- Shows you how the app works
- Won't appear again (stored in browser)

**To see it again:**
- Clear your browser's localStorage
- Or open in a private/incognito window

---

### ⚠️ Smart Confirmations

No more browser alerts! All confirmations are now:
- Styled inline banners at the top
- Confirm or cancel with clear buttons
- Dismiss with `Esc` key
- Smooth slide-in animations

**Confirmations appear for:**
- Starting over (protects your story)
- Export validations
- Important actions

---

### ⏳ Enhanced Loading

When generating videos or choices:
- See progress stages: Initializing → Generating → Processing → Finalizing
- Progress bar shows estimated completion
- Elapsed time counter
- Rotating messages to keep you entertained
- Beautiful particle effects in background

**Note:** Video generation can take 1-2 minutes - this is normal!

---

### 🎨 Visual Improvements

**Throughout the app:**
- Smooth fade-in animations for new segments
- Hover effects with subtle lift on buttons
- Glass-morphism effects on overlays
- Consistent color scheme (sky blue + indigo)
- Better focus indicators for keyboard navigation

---

## 🚀 Quick Workflow

1. **Select Model:** Choose Fast ⚡ or Standard ✨ mode
2. **Start:** Describe your opening scene
3. **Watch:** Enjoy the AI-generated video
4. **Choose:** Pick what happens next (use `1`, `2`, `3` for speed!)
5. **Navigate:** Press `S` to see your timeline anytime
6. **Jump:** Use arrow keys or timeline to navigate
7. **Export:** Save your story or create a video

---

## 💡 Pro Tips

1. **Model Strategy:** Use Fast mode for experimentation, Standard for your final version
2. **Keyboard Warrior:** Learn the shortcuts - they make the experience much faster!
3. **Timeline Navigation:** Use the sidebar to quickly jump to any point in your story
4. **Hover for Details:** Hover over previous video segments to see what choice led there
5. **Export Early:** Export your story periodically so you don't lose progress
6. **Mobile Friendly:** The timeline sidebar closes automatically on mobile when you select a segment
7. **Quality vs Speed:** The header badge shows your current model - check it before generating!

---

## 🎯 Accessibility

- Full keyboard navigation support
- Screen reader friendly
- Clear focus indicators
- High contrast colors
- Semantic HTML structure

---

## 🐛 Troubleshooting

**Timeline not opening?**
- Try pressing `S` or clicking the arrow button on the left

**Keyboard shortcuts not working?**
- Make sure you're not typing in a text input
- Press `Esc` to close any open dialogs first

**Welcome tutorial won't go away?**
- Click "Let's Begin!" button
- Or press `Esc`

**Jump to latest button stuck?**
- Scroll to the bottom of the page
- It will auto-hide when you're near the latest segment

---

## 📝 Feature Highlights

### Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Model Selection | Fixed (Fast only) | Choose Fast or Standard |
| Confirmations | Browser alerts | Styled inline banners |
| Navigation | Scroll only | Timeline sidebar + keyboard |
| Choices | Basic buttons | Animated with shortcuts |
| Loading | Simple spinner | Progress stages + timer |
| Videos | Static | Hover previews + animations |
| Shortcuts | None | 10 keyboard shortcuts |
| Onboarding | None | Welcome tutorial |

---

**Enjoy your enhanced VeoStory experience! 🎉**

