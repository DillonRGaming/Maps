const SOCKET_URL = "https://66a740202e90.ngrok-free.app";
let map;
let me=null;
let myMarker=null;
let placesService=null;
let socket=null;
let userMarkers={};
let buildingMarkers={};
let buildings={};

function initMap(){
  map=new google.maps.Map(document.getElementById("map"),{zoom:16,center:{lat:51.5074,lng:-0.1278},disableDefaultUI:false});
  placesService=new google.maps.places.PlacesService(map);
  const nameInput=document.getElementById("name");
  const claimBtn=document.getElementById("claim");
  const statusBox=document.getElementById("status");
  nameInput.value=localStorage.getItem("username")||"";
  nameInput.addEventListener("change",()=>localStorage.setItem("username",nameInput.value.trim()));
  socket=io(SOCKET_URL,{transports:["websocket"],path:"/socket.io",withCredentials:false});
  socket.on("connect",()=>{statusBox.textContent="connected";if(me){socket.emit("send-location",{username:nameInput.value.trim()||"Anonymous",lat:me.lat,lng:me.lng});}});
  socket.on("disconnect",()=>{statusBox.textContent="disconnected"});
  socket.on("receive-location",(d)=>{const id=d.id;const pos={lat:d.lat,lng:d.lng};if(userMarkers[id]){userMarkers[id].setPosition(pos);}else{userMarkers[id]=new google.maps.Marker({position:pos,map:map,label:(d.username||"U").slice(0,1).toUpperCase(),title:d.username||"User"});}});
  socket.on("user-disconnected",(id)=>{if(userMarkers[id]){userMarkers[id].setMap(null);delete userMarkers[id];}});
  socket.on("load-buildings",(b)=>{buildings=b||{};renderBuildings();});
  socket.on("building-claimed",(b)=>{buildings[b.placeId]=b;renderBuildings();});
  claimBtn.addEventListener("click",()=>{if(!me)return;const username=(nameInput.value.trim()||"Anonymous");nearbyBuilding(me,40).then(place=>{if(!place){alert("No building within ~40m");return;} const lat=place.geometry.location.lat();const lng=place.geometry.location.lng();socket.emit("claim-building",{placeId:place.place_id,name:place.name,lat,lng,owner:username});}).catch(()=>{});});
  if(navigator.geolocation){navigator.geolocation.watchPosition(p=>{me={lat:p.coords.latitude,lng:p.coords.longitude};if(!myMarker){myMarker=new google.maps.Marker({position:me,map:map,icon:{path:google.maps.SymbolPath.CIRCLE,scale:6},title:"You"});}else{myMarker.setPosition(me);} map.setCenter(me); if(socket&&socket.connected){socket.emit("send-location",{username:nameInput.value.trim()||"Anonymous",lat:me.lat,lng:me.lng});}},e=>{statusBox.textContent="geolocation denied";},{enableHighAccuracy:true,maximumAge:2000,timeout:10000});}
}

function renderBuildings(){
  Object.values(buildingMarkers).forEach(m=>m.setMap(null));
  buildingMarkers={};
  Object.values(buildings).forEach(b=>{const m=new google.maps.Marker({position:{lat:b.lat,lng:b.lng},map:map,label:"??",title:`${b.name} � ${b.owner}`});const iw=new google.maps.InfoWindow({content:`<div><b>${b.name}</b><br/>Owner: ${escapeHtml(b.owner)}</div>`});m.addListener("click",()=>iw.open({anchor:m,map}));buildingMarkers[b.placeId]=m;});
}

function nearbyBuilding(center,radius){
  return new Promise((resolve)=>{placesService.nearbySearch({location:center,radius:radius,type:"establishment"},(results,status)=>{if(status===google.maps.places.PlacesServiceStatus.OK&&results&&results.length){const p=results[0];resolve(p);}else{resolve(null);}});});
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
