(function registerApiAdapter(root){
  'use strict';

  class BssApiError extends Error{
    constructor(problem,status){
      super(problem?.message||`API zahtjev nije uspio (${status}).`);
      this.name='BssApiError';
      this.code=problem?.code||'HTTP_ERROR';
      this.status=status;
      this.requestId=problem?.requestId||null;
      this.fieldErrors=problem?.fieldErrors||null;
    }
  }

  const configuredBase=root.document?.querySelector('meta[name="bss-api-base"]')?.content?.trim();
  const base=(configuredBase||'/api/v1').replace(/\/$/,'');
  const REQUEST_TIMEOUT_MS=20_000;
  const REFRESH_VERSION_KEY='bss-auth-refresh-version-v1';
  let refreshInFlight=null;

  async function completeEmptyResponse(response){
    // Chromium can cancel an unread 204 when the next session/navigation starts.
    if(response.status===204)await response.text?.();
    return response;
  }

  async function fetchWithTimeout(url,options){
    if(typeof root.AbortController!=='function')return completeEmptyResponse(await root.fetch(url,options));
    const controller=new root.AbortController();
    const timeout=root.setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    const abort=()=>controller.abort();
    options.signal?.addEventListener('abort',abort,{once:true});
    if(options.signal?.aborted)controller.abort();
    try{return await completeEmptyResponse(await root.fetch(url,{...options,signal:controller.signal}));}
    catch(error){
      const timedOut=error?.name==='AbortError';
      let code=timedOut?'NETWORK_TIMEOUT':'NETWORK_ERROR';
      if(options.signal?.aborted)code='NETWORK_CANCELLED';
      throw new BssApiError({
        code,
        message:timedOut?'Poslužitelj nije odgovorio na vrijeme.':'Nije moguće povezati se s poslužiteljem.'
      },0);
    }finally{root.clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);}
  }

  function refreshVersion(){
    try{return root.localStorage?.getItem(REFRESH_VERSION_KEY)||'0';}catch{return'0';}
  }

  function markRefresh(){
    try{
      const current=Number(root.localStorage?.getItem(REFRESH_VERSION_KEY)||0);
      root.localStorage?.setItem(REFRESH_VERSION_KEY,String(Number.isSafeInteger(current)?current+1:1));
    }catch{/* Cookie je već rotiran; oznaka je samo koordinacija između tabova. */}
  }

  function refreshSession(observedVersion){
    if(!refreshInFlight){
      const rotate=async()=>{
        if(refreshVersion()!==observedVersion)return{ok:true,status:204};
        const response=await fetchWithTimeout(`${base}/auth/refresh`,{method:'POST',credentials:'include',headers:{Accept:'application/json'}});
        // Consume an unsuccessful response so its fetch cannot remain open until navigation.
        // Keep the original authorization failure; never replay after a failed refresh.
        if(!response.ok)await response.text?.();
        if(response.ok)markRefresh();
        return response;
      };
      const locks=root.navigator?.locks;
      refreshInFlight=(typeof locks?.request==='function'?locks.request('bss-auth-refresh-v1',rotate):rotate())
        .finally(()=>{refreshInFlight=null;});
    }
    return refreshInFlight;
  }

  async function request(path,{method='GET',body,rawBody,signal,headers={},response='json',retrySession=true}={}){
    const observedRefreshVersion=refreshVersion();
    const options={method,credentials:'include',headers:{Accept:'application/json',...headers},...(signal?{signal}:{})};
    if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    else if(rawBody!==undefined)options.body=rawBody;
    const result=await fetchWithTimeout(`${base}${path}`,options);
    if(result.status===401&&retrySession&&!path.startsWith('/auth/')){
      const refresh=await refreshSession(observedRefreshVersion);
      if(refresh.ok)return request(path,{method,body,rawBody,signal,headers,response,retrySession:false});
    }
    if(!result.ok){
      let problem;
      try{problem=await result.json();}catch{problem={message:`API zahtjev nije uspio (${result.status}).`};}
      throw new BssApiError(problem,result.status);
    }
    if(response==='blob')return result.blob();
    if(response==='response')return result;
    if(result.status===204)return null;
    return result.json();
  }

  function query(values={}){
    const search=new URLSearchParams();
    Object.entries(values).forEach(([key,value])=>{
      if(value!==undefined&&value!==null&&value!=='')search.set(key,String(value));
    });
    const value=search.toString();
    return value?`?${value}`:'';
  }

  const api=Object.freeze({
    base,
    request,
    query,
    get:(path,params)=>request(`${path}${query(params)}`),
    getWithMeta:async(path,params)=>{
      const result=await request(`${path}${query(params)}`,{response:'response'});
      return {data:await result.json(),etag:(result.headers.get('etag')||'').replace(/^W\//,'').replace(/^"|"$/g,'')};
    },
    upload:(path,file,headers,signal)=>request(path,{method:'POST',rawBody:file,headers,signal}),
    post:(path,body,headers)=>request(path,{method:'POST',body,headers}),
    put:(path,body,headers)=>request(path,{method:'PUT',body,headers}),
    patch:(path,body,headers)=>request(path,{method:'PATCH',body,headers}),
    download:async path=>{
      const result=await request(path,{response:'response'});
      const disposition=result.headers.get('content-disposition')||'';
      const fileName=disposition.match(/filename="?([^";]+)"?/i)?.[1]||'BSS-izvjestaj';
      return {blob:await result.blob(),fileName};
    },
    BssApiError
  });
  root.BSSCore=Object.freeze({...root.BSSCore,api});
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:window);
