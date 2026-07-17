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

  async function request(path,{method='GET',body,headers={},response='json',retrySession=true}={}){
    const options={method,credentials:'include',headers:{Accept:'application/json',...headers}};
    if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    const result=await root.fetch(`${base}${path}`,options);
    if(result.status===401&&retrySession&&!path.startsWith('/auth/')){
      const refresh=await root.fetch(`${base}/auth/refresh`,{method:'POST',credentials:'include',headers:{Accept:'application/json'}});
      if(refresh.ok)return request(path,{method,body,headers,response,retrySession:false});
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
