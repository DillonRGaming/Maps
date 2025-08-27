const SOCKET_URL = "https://66a740202e90.ngrok-free.app";
let map;
let me = null;
let myMarker = null;
let socket = null;
let userMarkers = {};

function init() {
  map = L.map('map').setView([51.5074, -0.1278], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const nameInput = document.getElementById("name");
  const statusBox = document.getElementById("status");

  nameInput.value = localStorage.getItem("username") || "";
  nameInput.addEventListener("change", () => localStorage.setItem("username", nameInput.value.trim()));

  socket = io(SOCKET_URL, { transports: ["websocket"], path: "/socket.io", withCredentials: false });

  socket.on("connect", () => {
    statusBox.textContent = "connected";
    if (me) {
      socket.emit("send-location", { username: nameInput.value.trim() || "Anonymous", lat: me.lat, lng: me.lng });
    }
  });

  socket.on("disconnect", () => {
    statusBox.textContent = "disconnected";
  });

  socket.on("receive-location", (d) => {
    const id = d.id;
    const pos = [d.lat, d.lng];
    if (userMarkers[id]) {
      userMarkers[id].setLatLng(pos);
    } else {
      userMarkers[id] = L.marker(pos, { title: d.username || "User" }).addTo(map)
        .bindTooltip(d.username || "User", { permanent: false });
    }
  });

  socket.on("user-disconnected", (id) => {
    if (userMarkers[id]) {
      map.removeLayer(userMarkers[id]);
      delete userMarkers[id];
    }
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(p => {
      me = { lat: p.coords.latitude, lng: p.coords.longitude };
      if (!myMarker) {
        myMarker = L.circleMarker([me.lat, me.lng], { radius: 6, color: "blue" }).addTo(map);
      } else {
        myMarker.setLatLng([me.lat, me.lng]);
      }
      map.setView([me.lat, me.lng]);
      if (socket && socket.connected) {
        socket.emit("send-location", { username: nameInput.value.trim() || "Anonymous", lat: me.lat, lng: me.lng });
      }
    }, e => { statusBox.textContent = "geolocation denied"; }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 });
  }
}

window.onload = init;
