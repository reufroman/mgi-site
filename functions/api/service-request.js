const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
export async function onRequestPost({request,env}){
 if(env.MGI_INTAKE_VERIFIED!=='true'||!env.MGI_REQUEST_PROVIDER_URL||!env.MGI_REQUEST_PROVIDER_TOKEN||!env.MGI_SITE_ORIGIN)return json({state:'unavailable',message:'Online requests are unavailable. No appointment has been arranged.'},503);
 if(request.headers.get('Origin')!==env.MGI_SITE_ORIGIN)return json({state:'rejected',message:'This request could not be accepted.'},403);
 if(!request.headers.get('Content-Type')?.includes('application/json'))return json({state:'rejected',message:'Use the website request form.'},415);
 if(Number(request.headers.get('Content-Length')||0)>12000)return json({state:'rejected',message:'The request is too large.'},413);
 let input;try{const text=await request.text();if(text.length>12000)return json({state:'rejected',message:'The request is too large.'},413);input=JSON.parse(text);}catch{return json({state:'rejected',message:'The request could not be read.'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({state:'rejected',message:'The request could not be read.'},400);
 if(input.website)return json({state:'rejected',message:'This request could not be accepted.'},400);
 const requestKey=clean(input.idempotencyKey,80);
 if(!/^[a-f0-9-]{36}$/i.test(requestKey))return json({state:'invalid',message:'Please reload the form and try again.'},422);
 const body={name:clean(input.name,100),contact:clean(input.contact,160),address:clean(input.address,240),town:clean(input.town,100),service:clean(input.service,150),concern:clean(input.concern,2000),source:'mgi-website',appointmentState:'requested'};
 const errors={};for(const k of ['name','contact','address','concern'])if(!body[k])errors[k]='Please fill in this field.';
 if(body.contact&&!(/^\S+@\S+\.\S+$/.test(body.contact)||/^\+?[\d\s().-]{7,24}$/.test(body.contact)))errors.contact='Enter a phone number or email.';
 if(Object.keys(errors).length)return json({state:'invalid',errors,message:'Please check the marked fields.'},422);
 let destination;try{destination=new URL(env.MGI_REQUEST_PROVIDER_URL);if(destination.protocol!=='https:')throw Error();}catch{return json({state:'unavailable',message:'Online requests are unavailable.'},503);}
 try{const response=await fetch(destination,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.MGI_REQUEST_PROVIDER_TOKEN}`,'Idempotency-Key':requestKey},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!response.ok)return json({state:'failed',message:'Your request could not be confirmed. No appointment has been arranged. Please try the verified contact path.'},502);
 const receipt=await response.json();if(receipt.accepted!==true||typeof receipt.receiptId!=='string'||!receipt.receiptId.trim())return json({state:'failed',message:'Your request could not be confirmed. No appointment has been arranged.'},502);
 return json({state:'received',receiptId:clean(receipt.receiptId,120),message:'Your service request was received. The office still needs to confirm availability and arrange a visit. This is not an appointment confirmation.'},202);
 }catch{return json({state:'failed',message:'Your request could not be confirmed. No appointment has been arranged.'},502);}
}
export const onRequestGet=()=>json({state:'unavailable',message:'Submit through the website request form.'},405);
