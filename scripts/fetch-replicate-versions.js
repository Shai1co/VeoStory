// scripts/fetch-replicate-versions.js
// Fetch the latest version hashes for Replicate models

const models = [
  { owner: 'stability-ai', name: 'stable-video-diffusion-img2vid-xt', constant: 'SVD_MODEL_VERSION' },
  { owner: 'lucataco', name: 'animate-diff', constant: 'ANIMATEDIFF_VERSION' },
  { owner: 'lucataco', name: 'hotshot-xl', constant: 'HOTSHOT_VERSION' },
  { owner: 'minimax', name: 'hailuo-02', constant: 'HAILUO_02_VERSION' },
  { owner: 'bytedance', name: 'seedance-1-lite', constant: 'SEEDANCE_LITE_VERSION' },
  { owner: 'bytedance', name: 'seedance-1-pro-fast', constant: 'SEEDANCE_PRO_FAST_VERSION' },
  { owner: 'bytedance', name: 'seedance-1-pro', constant: 'SEEDANCE_PRO_VERSION' },
  { owner: 'black-forest-labs', name: 'flux-schnell', constant: 'FLUX_SCHNELL_VERSION' }
];

async function fetchVersionHash(owner, name) {
  const url = `https://api.replicate.com/v1/models/${owner}/${name}`;
  
  // Note: API key is optional for public models, but recommended for rate limits
  const headers = {};
  if (process.env.REPLICATE_API_KEY) {
    headers['Authorization'] = `Token ${process.env.REPLICATE_API_KEY}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.latest_version?.id || null;
  } catch (error) {
    console.error(`❌ Error fetching ${owner}/${name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Fetching latest Replicate model versions...\n');
  
  const results = [];
  
  for (const model of models) {
    process.stdout.write(`Fetching ${model.owner}/${model.name}... `);
    const hash = await fetchVersionHash(model.owner, model.name);
    
    if (hash) {
      console.log(`✅ ${hash.substring(0, 12)}...`);
      results.push({ ...model, hash });
    } else {
      console.log('❌ Failed');
    }
  }
  
  console.log('\n📝 Copy these to services/replicateService.ts:\n');
  console.log('// Updated:', new Date().toISOString().split('T')[0]);
  
  for (const result of results) {
    if (result.hash) {
      console.log(`const ${result.constant} = '${result.hash}';`);
    }
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);

