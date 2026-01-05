const MITMProxy = require('http-mitm-proxy').Proxy; // Note the .Proxy at the end
const proxy = new MITMProxy(); // Use 'new' to initialize the class
const { Server } = require('socket.io');

// WebSocket server on port 3001
const io = new Server(3001, { 
  cors: { origin: "*" } 
});

proxy.onError(function(ctx, err) {
  console.error('Proxy Error:', err);
});

proxy.onRequest(function(ctx, callback) {
  const req = ctx.clientToProxyRequest;
  const host = req.headers.host;
  const packetId = `REAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  console.log(`Intercepted: ${host}${req.url}`);

  io.emit('request_intercepted', {
    id: packetId,
    method: req.method,
    url: `https://${host}${req.url}`,
    headers: req.headers,
    timestamp: new Date().toLocaleTimeString()
  });

  return callback();
});

proxy.listen({ port: 8080 }, function() {
  console.log('--- MITM ENGINE ACTIVE ---');
  console.log('Proxy Listening on Port: 8080');
  console.log('WebSocket Server on Port: 3001');
});