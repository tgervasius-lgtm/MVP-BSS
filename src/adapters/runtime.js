(function registerRuntimeAdapters(root){
  'use strict';

  function clone(value){ return JSON.parse(JSON.stringify(value)); }

  function createMemoryStorage(seed={}){
    const values = new Map(Object.entries(seed).map(([key,value])=>[key,String(value)]));
    return {
      getItem(key){ return values.has(String(key)) ? values.get(String(key)) : null; },
      setItem(key,value){ values.set(String(key),String(value)); },
      removeItem(key){ values.delete(String(key)); },
      clear(){ values.clear(); }
    };
  }

  function browserStorage(){
    try{
      const storage = root.localStorage;
      const probe = '__bss_storage_probe__';
      storage.setItem(probe,'1');
      storage.removeItem(probe);
      return storage;
    }catch(error){
      return null;
    }
  }

  function createStorageAdapter(storage){
    const memory = createMemoryStorage();
    return Object.freeze({
      get(key){
        try{
          const value = storage?.getItem(String(key));
          return value === null || value === undefined ? memory.getItem(key) : value;
        }catch(error){
          return memory.getItem(key);
        }
      },
      set(key,value){
        memory.setItem(key,value);
        try{ storage?.setItem(String(key),String(value)); }catch(error){}
      },
      remove(key){
        memory.removeItem(key);
        try{ storage?.removeItem(String(key)); }catch(error){}
      },
      getJson(key){
        const raw = this.get(key);
        if(raw === null) return null;
        try{ return JSON.parse(raw); }catch(error){ return null; }
      },
      setJson(key,value){ this.set(key,JSON.stringify(value)); }
    });
  }

  function createStateStore(storage){
    return Object.freeze({
      load(key,{version,fallback}){
        const stored = storage.getJson(key);
        return stored && stored.version === version ? stored : clone(fallback);
      },
      save(key,value){ storage.setJson(key,value); },
      clear(key){ storage.remove(key); }
    });
  }

  function createClock(nowProvider=()=>new Date()){
    const date = value=>value instanceof Date ? new Date(value.getTime()) : new Date(value);
    const format = value=>date(value).toLocaleString('hr-HR',{
      hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'
    }).replace(',', '.');
    return Object.freeze({
      nowDate(){ return date(nowProvider()); },
      nowMs(){ return date(nowProvider()).getTime(); },
      nowLabel(){ return format(nowProvider()); },
      futureDate(hours){ return new Date(date(nowProvider()).getTime()+Number(hours||0)*3600000); },
      futureLabel(hours){ return format(new Date(date(nowProvider()).getTime()+Number(hours||0)*3600000)); },
      format
    });
  }

  function createIdGenerator(clock){
    let last = 0;
    return Object.freeze({
      next(){
        const candidate = Math.trunc(Number(clock.nowMs())||0);
        last = Math.max(candidate,last+1);
        return last;
      }
    });
  }

  function create({storage=browserStorage(),now}={}){
    const storageAdapter = createStorageAdapter(storage);
    const clock = createClock(now);
    return Object.freeze({
      storage: storageAdapter,
      state: createStateStore(storageAdapter),
      clock,
      ids: createIdGenerator(clock)
    });
  }

  const active = create();
  const runtime = Object.freeze({
    ...active,
    create,
    createMemoryStorage
  });
  root.BSSCore = Object.freeze({...root.BSSCore,runtime});

  if(typeof module === 'object' && module.exports){
    module.exports = Object.freeze({create,createMemoryStorage});
  }
})(typeof globalThis === 'object' ? globalThis : window);
