# Replicate Model Update Guide

This guide explains how the Replicate models work in VeoStory and how to verify pricing.

## ✅ Good News: No Version Hashes Required

The new Replicate models (Wan and Veo) use **model paths** instead of version hashes. This means they automatically use the latest version available on Replicate, and you don't need to manually update version hashes!

## How It Works

### Model Paths vs Version Hashes

The new models use **model paths** like `wan-video/wan-2.5-i2v` instead of specific version hashes. When you make an API call, Replicate automatically uses the latest version of that model.

**Benefits:**
- ✅ No manual version updates needed
- ✅ Always get the latest model improvements
- ✅ Simpler code maintenance

### Model URLs

You can view model information and examples on these pages:

1. **Wan Models:**
   - Wan 2.5 I2V: https://replicate.com/wan-video/wan-2.5-i2v
   - Wan 2.5 I2V Fast: https://replicate.com/wan-video/wan-2.5-i2v-fast

2. **Veo Models on Replicate:**
   - Veo 3.1: https://replicate.com/google/veo-3.1
   - Veo 3.1 Fast: https://replicate.com/google/veo-3.1-fast
   - Veo 3: https://replicate.com/google/veo-3
   - Veo 3 Fast: https://replicate.com/google/veo-3-fast

## Verifying and Updating Costs

### Current Cost Estimates

The cost estimates in the UI are based on typical Replicate pricing:

| Cost Level | Symbol | Estimate | Description |
|------------|--------|----------|-------------|
| 1 | $ | ~$0.04-0.06 | Budget-friendly, fast models |
| 2 | $$ | ~$0.08-0.15 | Mid-range models |
| 3 | $$$ | ~$0.20-0.30 | Premium models |
| 4 | $$$$ | ~$0.40-0.50 | Highest-end models |

### How to Verify Actual Costs

1. Visit each model's page on Replicate (URLs above)
2. Look for the **"Pricing"** section on the model page
3. Note the cost shown (usually "Cost per run" or "Average cost")
4. Compare with the estimates in the table above

### Updating Cost Levels

If you find that a model's actual cost doesn't match its cost level, update it in `config/modelMetadata.ts`:

```typescript
'replicate-wan-2.5-i2v': {
  // ... other properties
  costLevel: 2, // <-- Change this (1-4) to match actual pricing
  // ...
}
```

Then update the cost estimates in the `getCostEstimate()` function if needed.

## Setting Up Your API Key

To use the Replicate models, you need to set your Replicate API key:

### Get Your API Key

1. Sign in to https://replicate.com
2. Go to https://replicate.com/account/api-tokens
3. Copy your API token

### Set the Environment Variable

```bash
# Windows (PowerShell)
$env:REPLICATE_API_KEY="your-api-key-here"

# Mac/Linux
export REPLICATE_API_KEY="your-api-key-here"
```

Or add it to a `.env` file in your project root:

```
REPLICATE_API_KEY=your-api-key-here
```

## Troubleshooting

### Models Don't Work

- **Check API key**: Ensure your REPLICATE_API_KEY is set correctly in your environment
- **Verify the model exists**: Make sure the model URL works when you visit it in your browser
- **Look at browser console**: Check for API errors that might indicate what's wrong
- **Check network tab**: Look for failed requests to `/replicate/v1/models/...`

### Cost Estimates Seem Wrong

- Replicate pricing changes over time
- Different models use different hardware (A100, H100, etc.) which affects cost
- Longer videos or higher resolutions cost more
- Check the model's page for the most current pricing

## Model-Specific Notes

### Wan Models
- **Audio**: These models generate background audio along with the video
- **Duration**: Typically 5-8 second videos
- **Best for**: Image-to-video with audio background

### Veo Models (on Replicate)
- **Audio**: Context-aware audio generation
- **Provider**: Google's Veo models hosted on Replicate
- **Note**: These are different from the direct Google Veo API models
- **Best for**: High-quality text-to-video or image-to-video with sophisticated audio

## Questions?

For the most up-to-date pricing and model information, always refer to:
- **Replicate Pricing**: https://replicate.com/pricing
- **Replicate Docs**: https://replicate.com/docs
- **Model Collections**: https://replicate.com/collections/image-to-video

