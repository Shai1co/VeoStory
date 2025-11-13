// scripts/fetch-replicate-versions.js
// Fetch the latest version hashes for Replicate models

const models = [
  // Keep FLUX for text-to-image generation
  { owner: 'black-forest-labs', name: 'flux-schnell', constant: 'FLUX_SCHNELL_VERSION' },
  // New Wan models with audio
  { owner: 'wan-video', name: 'wan-2.5-i2v', constant: 'WAN_2_5_I2V_VERSION' },
  { owner: 'wan-video', name: 'wan-2.5-i2v-fast', constant: 'WAN_2_5_I2V_FAST_VERSION' },
  // New Veo models on Replicate with audio
  { owner: 'google', name: 'veo-3.1', constant: 'VEO_3_1_VERSION' },
  { owner: 'google', name: 'veo-3.1-fast', constant: 'VEO_3_1_FAST_VERSION' },
  { owner: 'google', name: 'veo-3', constant: 'VEO_3_VERSION' },
  { owner: 'google', name: 'veo-3-fast', constant: 'VEO_3_FAST_VERSION' }
];

async function fetchModelInfo(owner, name) {
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
    const versionHash = data.latest_version?.id || null;
    
    // Try to get pricing info from the latest version
    let pricing = null;
    if (data.latest_version?.cog_version) {
      // Pricing is often shown in run_count or cost estimates
      const avgRunTime = data.latest_version?.openapi_schema?.info?.['x-replicate-avg-run-time'];
      pricing = {
        avgRunTime,
        description: data.description
      };
    }
    
    return { hash: versionHash, pricing };
  } catch (error) {
    console.error(`❌ Error fetching ${owner}/${name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Fetching latest Replicate model versions and pricing...\n');
  
  const results = [];
  
  for (const model of models) {
    process.stdout.write(`Fetching ${model.owner}/${model.name}... `);
    const info = await fetchModelInfo(model.owner, model.name);
    
    if (info && info.hash) {
      console.log(`✅ ${info.hash.substring(0, 12)}...`);
      results.push({ ...model, ...info });
    } else {
      console.log('❌ Failed');
    }
  }
  
  console.log('\n📝 Copy these to services/replicateService.ts:\n');
  console.log('// Updated:', new Date().toISOString().split('T')[0]);
  
  for (const result of results) {
    if (result.hash) {
      console.log(`// ${result.owner}/${result.name}`);
      if (result.pricing?.avgRunTime) {
        console.log(`// Avg runtime: ${result.pricing.avgRunTime}s`);
      }
      console.log(`const ${result.constant} = '${result.hash}';`);
      console.log('');
    }
  }
  
  console.log('\n💰 Pricing Information:\n');
  for (const result of results) {
    if (result.hash) {
      console.log(`${result.owner}/${result.name}:`);
      if (result.pricing?.description) {
        console.log(`  Description: ${result.pricing.description}`);
      }
      if (result.pricing?.avgRunTime) {
        console.log(`  Avg Runtime: ${result.pricing.avgRunTime}s`);
      }
      console.log('');
    }
  }
  
  console.log('✅ Done! Visit model pages on replicate.com for exact pricing.');
}

main().catch(console.error);

