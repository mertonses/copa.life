export async function onRequest(context){
  return context.env.ARENA_SERVICE.fetch(context.request);
}
