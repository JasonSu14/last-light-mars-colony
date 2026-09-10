import {existsSync} from 'node:fs';
for(const path of ['.env','.env.local','.dev.vars'])if(existsSync(path))process.loadEnvFile(path);
if(!process.env.OPENAI_API_KEY){console.error('No API key configured. Complete secure key setup first.');process.exit(1);}
try{
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:'gpt-6-astra',reasoning:{effort:'low'},input:'Reply with READY.',max_output_tokens:500}),signal:AbortSignal.timeout(30000)});
 if(!response.ok){console.error(`Model check failed: HTTP ${response.status}. Check project access, billing, or rate limits.`);process.exit(1);}
 const result=await response.json();console.log(JSON.stringify({model:result.model,status:result.status,requestSucceeded:true}));
}catch{console.error('Model connection failed or timed out.');process.exit(1);}
