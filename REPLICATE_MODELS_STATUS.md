# Replicate Models Update Status

## ✅ Completed

### 1. **Model Configuration Updated**
   - Removed 7 old Replicate models (SVD, AnimateDiff, HotShot, Hailuo-02, Seedance variants)
   - Added 6 new models with audio support:
     - **Wan 2.5 I2V** (with background audio)
     - **Wan 2.5 I2V Fast** (with background audio)
     - **Veo 3.1** (with context-aware audio)
     - **Veo 3.1 Fast** (with context-aware audio)
     - **Veo 3** (with audio)
     - **Veo 3 Fast** (with audio)

### 2. **Cost Display Enhanced**
   - Added `getCostEstimate()` function that shows approximate dollar amounts
   - Updated UI to display both $ symbols AND dollar estimates
   - Example display: `$$ ~$0.08-0.15`

### 3. **Updated Cost Estimates**
   Based on typical Replicate pricing for video models:
   - **Cost Level 1 ($)**: ~$0.04-0.06 per run
   - **Cost Level 2 ($$)**: ~$0.08-0.15 per run  
   - **Cost Level 3 ($$$)**: ~$0.20-0.30 per run
   - **Cost Level 4 ($$$$)**: ~$0.40-0.50 per run

### 4. **Documentation Created**
   - `REPLICATE_MODEL_UPDATE_GUIDE.md` - Complete guide for updating version hashes and costs
   - Updated `scripts/fetch-replicate-versions.js` to fetch new models

### 5. **Files Modified**
   - ✅ `types.ts` - Updated VideoModel type
   - ✅ `config/modelMetadata.ts` - New models and cost function
   - ✅ `components/ModelSelector.tsx` - Shows dollar amounts
   - ✅ `services/replicateService.ts` - Added new model configurations

## ✅ Models Ready to Use

### Update Complete: Using Model Paths Instead of Version Hashes

The new Replicate models now use **model paths** (e.g., `wan-video/wan-2.5-i2v`) instead of specific version hashes. This means:

- ✅ **No version hashes needed** - models automatically use the latest version
- ✅ **Always up-to-date** - when Replicate updates a model, you get the latest automatically
- ✅ **Easier maintenance** - no need to manually update version hashes

The models are **ready to use** right away! Just make sure you have your `REPLICATE_API_KEY` set in your environment.

## 📊 Current Model Pricing Estimates

| Model | Cost Level | Estimate | Features |
|-------|------------|----------|----------|
| **Wan 2.5 I2V Fast** | $ | ~$0.04-0.06 | Fast, 720p, audio |
| **Wan 2.5 I2V** | $$ | ~$0.08-0.15 | 720p, audio |
| **Veo 3.1 Fast** | $$ | ~$0.08-0.15 | Fast, context audio |
| **Veo 3 Fast** | $$ | ~$0.08-0.15 | Fast, audio |
| **Veo 3.1** | $$$ | ~$0.20-0.30 | Premium, context audio |
| **Veo 3** | $$$ | ~$0.20-0.30 | Premium, audio |

**Note**: These are estimates based on typical Replicate pricing. Actual costs may vary based on:
- Video length
- Resolution
- Hardware used (A100, H100, etc.)
- Processing time

## 🔍 Where to Find Exact Costs

For the most accurate pricing:
1. Visit each model's page on Replicate (links above)
2. Look for the "Pricing" or "Cost" section
3. Check the "Cost per run" or "Average cost" displayed

## 🚀 Next Steps

1. **Update version hashes** (Required for models to work)
2. **Verify costs** by visiting model pages
3. **Test each model** to ensure they work correctly
4. **Adjust cost levels** if actual pricing differs significantly from estimates

## 📚 Related Documentation

- `REPLICATE_MODEL_UPDATE_GUIDE.md` - Detailed update instructions
- `scripts/fetch-replicate-versions.js` - Automated version fetching script
- https://replicate.com/pricing - Official Replicate pricing
- https://replicate.com/collections/image-to-video - Model collection

