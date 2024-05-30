document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed");

    // Tokens
    const mapboxToken = 'pk.eyJ1IjoianBhZ2FuIiwiYSI6ImNsazNsbHc0ZDBhdTkzcnRqZzY1MWM2bDUifQ.N-AtmEVRh-MMioXPoQBayg';
    const customTileLayerURL = 'http://your-server-url/{z}/{x}/{y}.png';

    const map = L.map('map').setView([33.168640, -117.230423], 15); // Initial view set to specified coordinates with closer zoom

    const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    const mapboxSatelliteTileLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
        maxZoom: 19,
        attribution: 'Mapbox Satellite'
    });

    const esriTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Esri World Imagery'
    });

    const cartoDBVoyagerTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: 'CartoDB Voyager'
    });

    const googleImageryTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        attribution: 'Google Imagery'
    });

    const googleMapsTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}', {
        maxZoom: 19,
        attribution: 'Google Maps'
    });

    const customTileLayer = L.tileLayer(customTileLayerURL, {
        maxZoom: 19,
        attribution: 'Custom Imagery'
    });

    let currentTileLayer = osmTileLayer;

    document.getElementById('tileSource').addEventListener('change', function() {
        const selectedSource = this.value;
        console.log(`Tile source changed to: ${selectedSource}`);
        
        // Remove the current tile layer
        if (currentTileLayer) {
            console.log(`Removing current layer: ${currentTileLayer.getAttribution()}`);
            map.removeLayer(currentTileLayer);
        }

        switch (selectedSource) {
            case 'osm':
                currentTileLayer = osmTileLayer;
                break;
            case 'mapboxSatellite':
                currentTileLayer = mapboxSatelliteTileLayer;
                break;
            case 'esri':
                currentTileLayer = esriTileLayer;
                break;
            case 'cartoDBVoyager':
                currentTileLayer = cartoDBVoyagerTileLayer;
                break;
            case 'googleImagery':
                currentTileLayer = googleImageryTileLayer;
                break;
            case 'googleMaps':
                currentTileLayer = googleMapsTileLayer;
                break;
            case 'custom':
                currentTileLayer = customTileLayer;
                break;
            default:
                currentTileLayer = osmTileLayer;
        }

        console.log(`Adding layer: ${selectedSource}`);
        map.addLayer(currentTileLayer);
    });

    let originPoint;
    let drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    let drawnDashedLines = new L.FeatureGroup();
    map.addLayer(drawnDashedLines);

    map.on('click', function(e) {
        if (originPoint) {
            map.removeLayer(originPoint);
        }
        originPoint = L.marker(e.latlng).addTo(map);
        originPoint.setLatLng(e.latlng);
    });

    document.getElementById('drawFeature').addEventListener('click', function() {
        const distance = document.getElementById('distance').value;
        const bearing = document.getElementById('bearing').value;
        const colorValue = document.getElementById('color').value;
        const feature = document.getElementById('feature').value;

        if (!originPoint || !distance || !bearing) {
            alert('Please set a point of origin, distance, and bearing.');
            return;
        }

        const latlng = originPoint.getLatLng();
        const color = `rgb(${colorValue})`;

        // Remove the pin after getting the latlng
        map.removeLayer(originPoint);
        originPoint = null;

        const endpoint = calculateEndpoint(latlng, distance, bearing);

        if (feature === 'line') {
            drawLineWithArrow(latlng, endpoint, color, bearing);
        } else if (feature === 'buffer') {
            drawBufferCircle(latlng, distance, color);
        } else if (feature === 'lineAndBuffer') {
            drawLineWithArrow(latlng, endpoint, color, bearing);
            drawBufferCircle(latlng, distance, color, true);
        }
    });

    document.getElementById('searchButton').addEventListener('click', function() {
        const query = document.getElementById('search').value;
        if (query) {
            console.log(`Search button clicked with query: ${query}`);
            geocode(query);
        } else {
            console.log('Search query is empty.');
        }
    });

    document.getElementById('deleteFeaturesButton').addEventListener('click', function() {
        drawnItems.clearLayers();
        drawnDashedLines.clearLayers();
    });

    function geocode(query) {
        console.log(`Geocoding query: ${query}`);
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}`)
            .then(response => {
                console.log('Geocoding response:', response);
                return response.json();
            })
            .then(data => {
                console.log('Geocoding data:', data);
                if (data.features.length > 0) {
                    const [lng, lat] = data.features[0].center;
                    map.setView([lat, lng], 15);
                    if (originPoint) {
                        map.removeLayer(originPoint);
                    }
                    originPoint = L.marker([lat, lng]).addTo(map);
                } else {
                    alert('Address not found.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error occurred while searching for the address.');
            });
    }

    function calculateEndpoint(latlng, distance, bearing) {
        const R = 6378.1; // Radius of the Earth in km
        const brng = bearing * Math.PI / 180; // Convert bearing to radians
        const d = distance * 0.0009144; // Distance in km (1 yard = 0.0009144 km)

        const lat1 = latlng.lat * Math.PI / 180;
        const lon1 = latlng.lng * Math.PI / 180;

        const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) +
                               Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));

        const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
                                       Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

        return L.latLng(lat2 * 180 / Math.PI, lon2 * 180 / Math.PI);
    }

    function drawLineWithArrow(start, end, color, bearing) {
        const headLength = 0.0001; // Smaller arrowhead length
        let spreadAngle1, spreadAngle2;

        // Determine spread angles based on bearing
        if (bearing === 0 || (bearing >= 75 && bearing <= 100) || (bearing >= 175 && bearing <= 185) || (bearing >= 265 && bearing <= 275) || bearing === 360) {
            spreadAngle1 = Math.PI / 2; // Spread angle for the first arrowhead wing
            spreadAngle2 = Math.PI / 2; // Spread angle for the second arrowhead wing
        } else if ((bearing >= 10 && bearing <= 20) || (bearing >= 25 && bearing <= 65) || (bearing >= 186 && bearing <= 200) || (bearing >= 205 && bearing <= 245)) {
            spreadAngle1 = Math.PI / 1.80; // Spread angle for the first arrowhead wing
            spreadAngle2 = Math.PI / 2.25; // Spread angle for the second arrowhead wing
        } else if ((bearing >= 1 && bearing <= 9) || (bearing >= 21 && bearing <= 24) || (bearing >= 66 && bearing <= 74) || (bearing >= 201 && bearing <= 204) || (bearing >= 246 && bearing <= 264)) {
            spreadAngle1 = Math.PI / 1.95; // Spread angle for the first arrowhead wing
            spreadAngle2 = Math.PI / 2.10; // Spread angle for the second arrowhead wing
        } else if ((bearing >= 101 && bearing <= 115) || (bearing >= 160 && bearing <= 174) || (bearing >= 276 && bearing <= 290) || (bearing >= 340 && bearing <= 359)) {
            spreadAngle1 = Math.PI / 2.10; // Spread angle for the first arrowhead wing
            spreadAngle2 = Math.PI / 1.95; // Spread angle for the second arrowhead wing
        } else {
            spreadAngle1 = Math.PI / 2.20; // Spread angle for the first arrowhead wing
            spreadAngle2 = Math.PI / 1.85; // Spread angle for the second arrowhead wing
        }

        const angle = Math.atan2(end.lng - start.lng, end.lat - start.lat); // Angle of the line

        // Calculate the two points of the arrowhead
        const arrowHead1 = L.latLng(
            end.lat - headLength * Math.cos(angle - spreadAngle1),
            end.lng - headLength * Math.sin(angle - spreadAngle1)
        );

        const arrowHead2 = L.latLng(
            end.lat - headLength * Math.cos(angle + spreadAngle2),
            end.lng - headLength * Math.sin(angle + spreadAngle2)
        );

        // Combine the start point, end point, and arrowhead points into a single polyline
        const lineWithArrow = L.polyline([start, end, arrowHead1, end, arrowHead2], { color: color, weight: 4 });
        drawnItems.addLayer(lineWithArrow); // Add to the drawnItems layer group
    }

    function drawBufferCircle(center, distance, color, thin = false) {
        const radius = distance * 0.9144; // Convert yards to meters (1 yard = 0.9144 meters)
        const bufferCircle = L.circle(center, {
            radius: radius,
            color: color,
            weight: thin ? 1 : 4,
            fillOpacity: 0 // Make the inside of the buffer transparent
        });
        drawnItems.addLayer(bufferCircle); // Add to the drawnItems layer group
    }

    // Hand-drawn dashed lines
    var drawingDashedLine = false;
    var drawnDashedLine = null;

    document.getElementById('startDrawDashedLine').addEventListener('click', function() {
        drawingDashedLine = !drawingDashedLine;
        if (drawingDashedLine) {
            map.on('click', onMapClick);
            map.on('dblclick', finishDashedLine);
        } else {
            map.off('click', onMapClick);
            map.off('dblclick', finishDashedLine);
            if (drawnDashedLine) {
                map.removeLayer(drawnDashedLine);
                drawnDashedLine = null;
            }
        }
    });

    function onMapClick(e) {
        var color = document.getElementById('dashedLineColor').value.split(',');
        var latlng = e.latlng;

        if (!drawnDashedLine) {
            drawnDashedLine = L.polyline([latlng], {
                color: 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')',
                dashArray: '5, 10'
            }).addTo(drawnDashedLines);
        } else {
            drawnDashedLine.addLatLng(latlng);
        }
    }

    function finishDashedLine() {
        if (drawingDashedLine && drawnDashedLine) {
            drawingDashedLine = false;
            map.off('click', onMapClick);
            map.off('dblclick', finishDashedLine);
            drawnDashedLine = null; // Reset the drawnDashedLine for the next drawing
        }
    }

    // Function to download data as a file
    function downloadData(data, filename, type) {
        const file = new Blob([data], { type: type });
        const a = document.createElement("a");
        const url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    // Function to convert GeoJSON to KML
    function convertGeoJSONToKML(geojson) {
        // Basic implementation for converting GeoJSON to KML
        // You may need to use a more comprehensive library for a full conversion
        const kmlHeader = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>';
        const kmlFooter = '</Document></kml>';
        const kmlBody = geojson.features.map(feature => {
            const coordinates = feature.geometry.coordinates[0].map(coord => coord.join(',')).join(' ');
            return `<Placemark><name>${feature.properties.name || 'Feature'}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
        }).join('');
        return kmlHeader + kmlBody + kmlFooter;
    }

    // Add event listener to download features button
    document.getElementById('downloadFeaturesButton').addEventListener('click', function() {
        const modal = document.getElementById("downloadModal");
        modal.style.display = "block";
    });

    // Close the modal when the user clicks on <span> (x)
    document.querySelector(".close-button").addEventListener('click', function() {
        const modal = document.getElementById("downloadModal");
        modal.style.display = "none";
    });

    // Handle the download confirmation
    document.getElementById('confirmDownload').addEventListener('click', function() {
        const fileName = document.getElementById('fileName').value || 'features';
        const format = document.getElementById('fileFormat').value;
        
        const includeLine = document.getElementById('downloadLine').checked;
        const includeBuffer = document.getElementById('downloadBuffer').checked;
        const includeDashedLine = document.getElementById('downloadDashedLine').checked;

        // Collect the selected features
        let geojson = { type: 'FeatureCollection', features: [] };

        if (includeLine) {
            drawnItems.eachLayer(function(layer) {
                if (layer instanceof L.Polyline && !layer.options.dashArray) {
                    geojson.features.push(layer.toGeoJSON());
                }
            });
        }
        if (includeBuffer) {
            drawnItems.eachLayer(function(layer) {
                if (layer instanceof L.Circle) {
                    geojson.features.push(layer.toGeoJSON());
                }
            });
        }
        if (includeDashedLine) {
            drawnDashedLines.eachLayer(function(layer) {
                geojson.features.push(layer.toGeoJSON());
            });
        }

        let dataStr, dataType;

        if (format === 'geojson') {
            dataStr = JSON.stringify(geojson);
            dataType = 'application/json';
        } else if (format === 'kml') {
            dataStr = convertGeoJSONToKML(geojson);
            dataType = 'application/vnd.google-earth.kml+xml';
        } else {
            alert('Unsupported file format');
            return;
        }

        downloadData(dataStr, `${fileName}.${format}`, dataType);
        document.getElementById("downloadModal").style.display = "none";
    });

    // Show/Hide Compass
    document.getElementById('toggleCompassButton').addEventListener('click', function() {
        const compassContainer = document.getElementById('compassContainer');
        if (compassContainer.style.display === 'none' || compassContainer.style.display === '') {
            compassContainer.style.display = 'block';
        } else {
            compassContainer.style.display = 'none';
        }
    });
});
