const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const MITMProxy = require('http-mitm-proxy').Proxy;

const app = express();
const server = http.createServer(app);

// 1. WebSocket Setup
const io = new Server(server, { 
  cors: { 
    // ✅ Replace with your actual Vercel URLs
    origin: ["https://aura-app.vercel.app", "https://securecomm-simulator.vercel.app"],
    methods: ["GET", "POST"]
  } 
});

app.use(cors({
  origin: ["https://aura-app.vercel.app", "https://securecomm-simulator.vercel.app"]
}));

// 🛰️ Endpoint that Aura ChatBubble calls
app.post('/capture', (req, res) => {
  const data = req.body;
  // Broadcasts the 'hello' message to the SecureComm Simulator
  io.emit('new_data', { ...data, type: 'MITM_PACKET' });
  res.status(200).send({ status: "captured" });
});

// 4. MITM Engine Setup (from your proxy.js)
const proxy = new MITMProxy();
proxy.onError((ctx, err) => console.error('Proxy Error:', err));
proxy.onRequest((ctx, callback) => {
  const req = ctx.clientToProxyRequest;
  io.emit('request_intercepted', {
    id: `REAL-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    method: req.method,
    url: `https://${req.headers.host}${req.url}`,
    headers: req.headers,
    timestamp: new Date().toLocaleTimeString()
  });
  return callback();
});

// 5. Port Listening
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend & WebSockets on Port: ${PORT}`);
  // Port 8080 is local-only; in production Render uses the PORT variable above
});