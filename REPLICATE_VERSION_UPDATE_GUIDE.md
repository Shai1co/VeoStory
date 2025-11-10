# Replicate Model Version Update Guide

This guide explains how to find and update the latest version hashes for all Replicate models in this project.

## Why Version Hashes?

Replicate uses version hashes (64-character hexadecimal strings) to identify specific versions of models. These hashes ensure you're using a consistent, tested version of each model.

## How to Find Latest Version Hashes

### Step-by-Step Instructions:

1. **Visit the Model's Replicate Page** (URLs listed below)
2. **Click the "API" tab** at the top of the page
3. **Look for the example code** - Find the `version` field in the example
4. **Copy the full hash** - It's a 64-character hexadecimal string
5. **Update the constant** in `services/replicateService.ts`

## Model URLs and Current Status

### ✅ AnimateDiff
- **URL**: https://replicate.com/lucataco/animate-diff
- **Model Path**: `lucataco/animate-diff`
- **Constant Name**: `ANIMATEDIFF_VERSION`
- **File Location**: `services/replicateService.ts` (line ~55)
- **Status**: ⚠️ **NEEDS UPDATE** - Placeholder version
- **Expected Input Parameters**:
  - `image`: Image URL or data URL
  - `motion_module`: Motion module to use (e.g., 'v3_sd15_mm')
  - `steps`: Number of inference steps (default: 25)
  - `guidance_scale`: Guidance scale (default: 7.5)

### ⚡ HotShot-XL
- **URL**: https://replicate.com/andreasjansson/hotshot-xl
- **Model Path**: `andreasjansson/hotshot-xl`
- **Constant Name**: `HOTSHOT_VERSION`
- **File Location**: `services/replicateService.ts` (line ~60)
- **Status**: ⚠️ **NEEDS UPDATE** - Placeholder version
- **Expected Input Parameters**:
  - `image`: Image URL or data URL
  - `fps`: Frames per second (default: 8)
  - `output_format`: Output format (e.g., 'mp4')

### 🎯 I2VGen-XL
- **URL**: https://replicate.com/lucataco/i2vgen-xl
- **Model Path**: `lucataco/i2vgen-xl`
- **Constant Name**: `I2VGEN_XL_VERSION`
- **File Location**: `services/replicateService.ts` (line ~65)
- **Status**: ⚠️ **NEEDS UPDATE** - Placeholder version
- **Expected Input Parameters**:
  - `image`: Image URL or data URL
  - `max_frames`: Maximum number of frames (default: 80)
  - `target_fps`: Target FPS (default: 24)

### 🔄 SVD-XT 1.1
- **URL**: https://replicate.com/stability-ai/stable-video-diffusion-img2vid-xt-1-1
- **Model Path**: `stability-ai/stable-video-diffusion-img2vid-xt-1-1`
- **Constant Name**: `SVD_XT_1_1_VERSION`
- **File Location**: `services/replicateService.ts` (line ~70)
- **Status**: ⚠️ **NEEDS UPDATE** - Placeholder version
- **Expected Input Parameters**:
  - `input_image`: Image URL or data URL
  - `frames`: Number of frames (default: 50)
  - `motion_bucket_id`: Motion strength 1-255 (default: 127)
  - `cond_aug`: Conditioning augmentation (default: 0.02)

### 🎨 CogVideoX-5B
- **URL**: https://replicate.com/lucataco/cogvideox-5b
- **Model Path**: `lucataco/cogvideox-5b`
- **Constant Name**: `COGVIDEOX_VERSION`
- **File Location**: `services/replicateService.ts` (line ~75)
- **Status**: ⚠️ **NEEDS UPDATE** - Placeholder version
- **Expected Input Parameters**:
  - `image`: Image URL or data URL
  - `num_frames`: Number of frames to generate (default: 120)
  - `num_inference_steps`: Number of inference steps (default: 50)

## Example: How to Update a Version Hash

Let's update AnimateDiff as an example:

1. Visit: https://replicate.com/lucataco/animate-diff
2. Click the "API" tab
3. Look for code like this:
   ```python
   output = replicate.run(
       "lucataco/animate-diff:1531004ee4c98894ab11f8a4ce6206099e732c1da15121987a8eef54828f0663",
       ...
   )
   ```
4. Copy the hash after the colon: `1531004ee4c98894ab11f8a4ce6206099e732c1da15121987a8eef54828f0663`
5. Open `services/replicateService.ts`
6. Find the line with `const ANIMATEDIFF_VERSION = '...'`
7. Replace the hash with the one you copied
8. Update the "Last checked" comment with today's date

## Testing After Updates

After updating version hashes:

1. **Test each model individually**:
   - Select the model in the UI
   - Try both text-to-video and image-to-video
   - Verify the video generates successfully

2. **Check the console logs**:
   - Look for error messages
   - Verify the correct version is being used

3. **Monitor API responses**:
   - Ensure no 404 or version-related errors
   - Check that prediction status changes correctly

## Troubleshooting

### Error: "Model version not found"
- The version hash is incorrect or outdated
- Visit the model page and get the latest version

### Error: "Invalid input parameters"
- The model's API may have changed
- Check the Replicate documentation for current input schema
- Update the `buildInput` function in `replicateService.ts`

### Error: "Prediction failed"
- Check your Replicate API key balance
- Verify the input image format is supported
- Check model-specific requirements on Replicate

## Quick Update Checklist

- [ ] Visit AnimateDiff page → Update `ANIMATEDIFF_VERSION`
- [ ] Visit HotShot-XL page → Update `HOTSHOT_VERSION`
- [ ] Visit I2VGen-XL page → Update `I2VGEN_XL_VERSION`
- [ ] Visit SVD-XT 1.1 page → Update `SVD_XT_1_1_VERSION`
- [ ] Visit CogVideoX-5B page → Update `COGVIDEOX_VERSION`
- [ ] Test all models in the UI
- [ ] Commit the changes with version update notes

## Additional Resources

- **Replicate Documentation**: https://replicate.com/docs
- **Video Generation Models Collection**: https://replicate.com/collections/homepage-generate-videos
- **API Reference**: https://replicate.com/docs/reference/http

## Notes

- Version hashes change when models are updated
- It's good practice to update versions monthly or when issues occur
- Always test after updating to ensure compatibility
- Keep the old version hash in git history in case you need to rollback

