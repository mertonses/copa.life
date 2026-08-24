export async function onRequest(context){
  return context.env.GHOST_SERVICE.fetch(context.request);
}
