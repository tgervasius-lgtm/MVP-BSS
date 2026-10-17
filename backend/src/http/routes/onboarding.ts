import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError, requireRevision } from "../../domain/errors.js";
import type { ActorContext } from "../../domain/types.js";
import { requireRole } from "../../security/rbac.js";
import { STEPS, type EvidenceWrite, type OnboardingService } from "../../onboarding/model.js";
import type { Authenticate } from "../app.js";

const checksum = { type:"string",pattern:"^[a-f0-9]{64}$" };
const evidence = { type:"object", additionalProperties:false, required:["step","reference"], properties:{
  step:{type:"string",enum:STEPS}, reference:{type:"string",minLength:1,maxLength:500}, note:{type:"string",maxLength:1000} } };
const body = { type:"object",additionalProperties:false,required:["configurationChecksum","items"],properties:{
  configurationChecksum:checksum, items:{type:"array",minItems:1,maxItems:20,items:evidence} } };
const evaluation = { type:"object",additionalProperties:false,required:["configurationChecksum"],properties:{configurationChecksum:checksum} };
const querystring = { type:"object",additionalProperties:false,properties:{} };

export async function registerOnboardingRoutes(app: FastifyInstance,
  dependencies: { authenticate:Authenticate; onboarding?:OnboardingService }): Promise<void> {
  await app.register((app, _options, done) => {
    const actors = new WeakMap<FastifyRequest,ActorContext>();
    const service = () => {
      if (!dependencies.onboarding) throw new AppError("ONBOARDING_UNAVAILABLE", "Priprema korisnika nije aktivirana.");
      return dependencies.onboarding;
    };
    app.addHook("onRequest",async request => {
      const {actor}=await dependencies.authenticate(request); requireRole(actor,["admin"]); actors.set(request,actor);
    });
    app.setErrorHandler((error,request,reply) => {
      const value=error as {statusCode?:number;code?:string;validation?:unknown};
      let problem:AppError;
      if(error instanceof AppError) problem=error;
      else if(value.statusCode===429 || value.code==="RATE_LIMITED") problem=new AppError("RATE_LIMITED","Previše zahtjeva. Pokušajte ponovno kasnije.");
      else if(value.validation || value.statusCode===400 || value.statusCode===415 || value.statusCode===413)
        problem=new AppError("VALIDATION_FAILED","Zahtjev sadrži neispravna polja ili prevelik sadržaj.");
      else {
        request.log.error({event:"onboarding_unavailable",requestId:request.id},"Onboarding dependency unavailable");
        problem=new AppError("ONBOARDING_UNAVAILABLE","Priprema korisnika trenutačno nije dostupna.");
      }
      if(problem.statusCode===503)reply.header("Retry-After","60");
      return reply.code(problem.statusCode).send({code:problem.code,message:problem.message,requestId:request.id});
    });
    app.get("/api/v1/onboarding",{config:{rateLimit:{max:60,timeWindow:"1 minute"}},schema:{querystring}},async(request,reply)=>{
      const result=await service().get(actors.get(request)!,request.id); reply.header("ETag",'"'+result.revision+'"');return result;
    });
    app.patch<{Body:EvidenceWrite}>("/api/v1/onboarding/evidence",{bodyLimit:131072,config:{rateLimit:{max:10,timeWindow:"1 minute"}},schema:{querystring,body}},async(request,reply)=>{
      const revision=requireRevision(request.headers["if-match"]);
      const result=await service().record(actors.get(request)!,revision,request.body,request.id);
      reply.header("ETag",'"'+result.revision+'"');return result;
    });
    app.post<{Body:{configurationChecksum:string}}>("/api/v1/onboarding/evaluate",{bodyLimit:1024,config:{rateLimit:{max:10,timeWindow:"1 minute"}},schema:{querystring,body:evaluation}},async(request,reply)=>{
      const revision=requireRevision(request.headers["if-match"]);
      const result=await service().evaluate(actors.get(request)!,revision,request.body.configurationChecksum,request.id);
      reply.header("ETag",'"'+result.revision+'"');return result;
    });
    done();
  });
}
