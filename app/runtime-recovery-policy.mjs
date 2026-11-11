export const ORIGIN='https://dragonbound.net';
export function selectTarget(targets,preferred){const allowed=targets.filter(t=>{try{const url=new URL(t.url);return t.type==='page'&&url.origin===ORIGIN&&(url.pathname==='/'||/^\/r\/[A-Za-z0-9]+\/?$/.test(url.pathname))}catch{return false}});return allowed.find(t=>t.targetId===preferred)??(allowed.length===1?allowed[0]:null)}
export function selectRootContext(contexts,frameId){return contexts.find(c=>c.origin===ORIGIN&&c.auxData?.isDefault&&c.auxData?.frameId===frameId)??null}
export function needsRestore(flags){return !flags?.network||!flags?.overlay||!flags?.modules}
