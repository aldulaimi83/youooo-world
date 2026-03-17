
const FINNHUB="PUT_YOUR_KEY_HERE"

const map=new maplibregl.Map({

container:"map",

style:{
version:8,
sources:{
carto:{
type:"raster",
tiles:[
"https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
],
tileSize:256
}
},

layers:[{
id:"carto",
type:"raster",
source:"carto"
}]
},

center:[-98,38],
zoom:3

})

map.addControl(new maplibregl.NavigationControl())



const earthquakeMarkers=[]
const aircraftMarkers=[]
const conflictMarkers=[]



function clearMarkers(arr){

arr.forEach(m=>m.remove())
arr.length=0

}



async function loadEarthquakes(){

clearMarkers(earthquakeMarkers)

const res=await fetch(
"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)

const data=await res.json()

data.features.forEach(q=>{

const lon=q.geometry.coordinates[0]
const lat=q.geometry.coordinates[1]

const el=document.createElement("div")
el.className="marker"

const marker=new maplibregl.Marker({element:el})
.setLngLat([lon,lat])
.addTo(map)

earthquakeMarkers.push(marker)

})

}



async function loadAircraft(){

clearMarkers(aircraftMarkers)

const res=await fetch(
"https://opensky-network.org/api/states/all"
)

const data=await res.json()

data.states.slice(0,200).forEach(p=>{

const lon=p[5]
const lat=p[6]

if(!lon||!lat)return

const el=document.createElement("div")
el.className="aircraft"

const marker=new maplibregl.Marker({element:el})
.setLngLat([lon,lat])
.addTo(map)

aircraftMarkers.push(marker)

})

}



async function loadMarket(){

const symbols=["SPY","QQQ","GLD","AMD","NVDA"]

let out=[]

for(const s of symbols){

try{

const r=await fetch(
`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FINNHUB}`
)

const d=await r.json()

const price=d.c

out.push(`${s} ${price}`)

}catch{

out.push(`${s} N/A`)

}

}

document.getElementById("market-data").innerText=out.join(" | ")

}



document.getElementById("toggle-earthquakes")
.addEventListener("change",e=>{

if(e.target.checked)loadEarthquakes()
else clearMarkers(earthquakeMarkers)

})


document.getElementById("toggle-aircraft")
.addEventListener("change",e=>{

if(e.target.checked)loadAircraft()
else clearMarkers(aircraftMarkers)

})



loadEarthquakes()

loadMarket()

setInterval(loadMarket,60000)
