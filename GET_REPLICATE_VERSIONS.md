# How to Get Replicate Model Version Hashes

## The Issue
Replicate model version hashes cannot be automatically retrieved. You must manually visit each model page to get the current version hash.

## Quick Steps (5 minutes per model)

### 1. AnimateDiff

**Step-by-step:**
1. Open your browser and go to: https://replicate.com/lucataco/animate-diff
2. Click the **"API"** tab (near the top of the page)
3. Scroll down to find example code that looks like this:
   ```
   curl -s -X POST \
   "https://api.replicate.com/v1/predictions" \
   -H "Authorization: Token $REPLICATE_API_TOKEN" \
   -H "Content-Type: application/json" \
   -d '{
     "version": "THE_HASH_YOU_NEED_IS_HERE",
     ...
   ```
4. Copy the entire version hash (it's a long string of letters and numbers, 64 characters)
5. Open `services/replicateService.ts` in your editor
6. Find line ~55: `const ANIMATEDIFF_VERSION = '...'`
7. Replace the string between the quotes with your copied hash
8. Update the comment to today's date

---

### 2. HotShot-XL

**Direct URL:** https://replicate.com/lucataco/hotshot-xl

**Steps:**
1. Visit the URL above
2. Click **"API"** tab
3. Find the `"version": "..."` in the example code
4. Copy the hash
5. Update line ~60 in `services/replicateService.ts`: `const HOTSHOT_VERSION`

---

### 3. Hailuo-02

**Direct URL:** https://replicate.com/minimax/hailuo-02

**Steps:**
1. Visit the URL above
2. Click **"API"** tab
3. Find the `"version": "..."` in the example code
4. Copy the hash
5. Update line ~65 in `services/replicateService.ts`: `const HAILUO_02_VERSION`

---

### 4. Seedance 1 Lite

**Direct URL:** https://replicate.com/bytedance/seedance-1-lite

**Steps:**
1. Visit the URL above
2. Click **"API"** tab
3. Find the `"version": "..."` in the example code
4. Copy the hash
5. Update line ~70 in `services/replicateService.ts`: `const SEEDANCE_LITE_VERSION`

---

### 5. Seedance 1 Pro Fast

**Direct URL:** https://replicate.com/bytedance/seedance-1-pro-fast

**Steps:**
1. Visit the URL above
2. Click **"API"** tab
3. Find the `"version": "..."` in the example code
4. Copy the hash
5. Update line ~75 in `services/replicateService.ts`: `const SEEDANCE_PRO_FAST_VERSION`

---

### 6. Seedance 1 Pro

**Direct URL:** https://replicate.com/bytedance/seedance-1-pro

**Steps:**
1. Visit the URL above
2. Click **"API"** tab
3. Find the `"version": "..."` in the example code
4. Copy the hash
5. Update line ~80 in `services/replicateService.ts`: `const SEEDANCE_PRO_VERSION`

---

## After Updating All Hashes

1. **Models are already enabled** in `config/modelMetadata.ts` (line ~191-198):
   ```typescript
   replicate: [
     MODEL_METADATA['replicate-svd'],
     MODEL_METADATA['replicate-animatediff'],
     MODEL_METADATA['replicate-hotshot'],
     MODEL_METADATA['replicate-hailuo-02'],
     MODEL_METADATA['replicate-seedance-lite'],
     MODEL_METADATA['replicate-seedance-pro-fast'],
     MODEL_METADATA['replicate-seedance-pro']
   ]
   ```

2. **Test each model**:
   - Refresh your app
   - Select the Replicate section in Model Selector
   - You should see all 7 models
   - Try generating a video with each one

---

## Example of What a Version Hash Looks Like

A valid Replicate version hash looks like this:
```
1531004ee4c98894ab11f8a4ce6206099e732c1da15121987a8eef54828f0663
```

It's always:
- Exactly 64 characters long
- Only lowercase letters (a-f) and numbers (0-9)
- No spaces, dashes, or special characters

---

## Troubleshooting

### "I can't find the API tab"
- Make sure you're on the model's main page on Replicate.com
- The API tab is usually next to "Overview" and "Versions" tabs
- Try refreshing the page

### "The example code doesn't show a version"
- Look for code examples in Python, Node.js, or cURL
- The version is usually in the first few lines
- Try the "Versions" tab if you can't find it in API

### "I updated the hash but still get errors"
- Double-check you copied the entire hash (all 64 characters)
- Make sure there are no spaces or line breaks in the string
- Verify you updated the correct constant name
- Restart your development server

---

## Need Help?

If you're stuck on a specific model:
1. Take a screenshot of the Replicate model page (API tab)
2. Show what error you're getting
3. The version hash is definitely there in the API examples!

---

## Final Checklist

- [ ] Get AnimateDiff hash → Update ANIMATEDIFF_VERSION
- [ ] Get HotShot hash → Update HOTSHOT_VERSION  
- [ ] Get Hailuo-02 hash → Update HAILUO_02_VERSION
- [ ] Get Seedance Lite hash → Update SEEDANCE_LITE_VERSION
- [ ] Get Seedance Pro Fast hash → Update SEEDANCE_PRO_FAST_VERSION
- [ ] Get Seedance Pro hash → Update SEEDANCE_PRO_VERSION
- [ ] All models already enabled in modelMetadata.ts
- [ ] Test each model in the app
- [ ] Done! 🎉

