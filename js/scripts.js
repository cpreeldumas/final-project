
function openAboutPopup() {
    document.getElementById("nav-about-popup").style.display = "block";
    document.getElementById("nav-popup-overlay").style.display = "block";
}

function openMethodsPopup() {
    document.getElementById("nav-methods-popup").style.display = "block";
    document.getElementById("nav-popup-overlay").style.display = "block";
}

function closeAboutPopup() {
    document.getElementById("nav-about-popup").style.display = "none";
    document.getElementById("nav-popup-overlay").style.display = "none";
}

function closeMethodsPopup() {
    document.getElementById("nav-methods-popup").style.display = "none";
    document.getElementById("nav-popup-overlay").style.display = "none";
}

mapboxgl.accessToken = 'pk.eyJ1IjoiY3ByZWVsZHVtYXMiLCJhIjoiY2x1bHZ0dGJ0MGw4bTJpbGxwdm5jZmQ4cyJ9.ZusuHjH6O73kH4F2RmenWA';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11', // dark basemap
    center: [-73.96143, 40.73941], // starting position [lng, lat]
    zoom: 11, // starting zoom
});


map.addControl(new mapboxgl.NavigationControl());

// when the map is finished it's initial load, add sources and layers.
map.on('load', function () {

    // add a geojson source for the borough boundaries
    map.addSource('borough-boundaries', {
        type: 'geojson',
        data: 'data/borough-boundaries-simplified.geojson',
    })

    // add a geojson source for tract choropleth
    map.addSource('map-data-tract', {
        type: 'geojson',
        data: 'data/map_data_tract.geojson',
    })

    // add a geojson source for bbl choropleth
    map.addSource('map-data-bbl', {
        type: 'geojson',
        data: 'data/map_data_bbl.geojson',
    })

    // Create LabelLayerID for 3D Buildings
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
    ).id;

    // first add the fill layer, using a match expression to give each a unique color based on its quadrant property
    map.addLayer({
        id: 'map-data-tract-fill',
        type: 'fill',
        source: 'map-data-tract',
        paint: {
            'fill-color': [
                'match',
                ['get', 'qd_2024'],
                'stable_rentb', '#757FBD',
                'stable', '#BDC4E3',
                'atrisk', '#F89638',
                'monitor', '#F9E2B4',
                '#6e6e6e'
            ],
            'fill-opacity': 0.9

        }
    },
        labelLayerId
    )
    // add borough outlines after the fill layer, so the outline is "on top" of the fill
    map.addLayer({
        id: 'borough-boundaries-line',
        type: 'line',
        source: 'borough-boundaries',
        paint: {
            'line-color': '#ccc'
        }
    })

    // Add a layer for highlighting the clicked polygon
    map.addLayer({
        id: 'highlighted-tract',
        type: 'line',
        source: 'map-data-tract',
        paint: {
            'line-color': 'white',
            'line-width': 2,
            'line-opacity': 0.8,
            'line-blur': 0.3
        },
        filter: ['==', 'GEOID', ''] // Initially filter to none
    });

    // When a click event occurs on a feature in the states layer,
    // open a popup at the location of the click, with description
    map.on('click', 'map-data-tract-fill', (e) => {
        const qd_2024 = e.features[0].properties.qd_2024;
        const qd_2030 = e.features[0].properties.qd_2030;

        // Check if either qd_2024 or qd_2030 is missing
        if (qd_2024 === undefined || qd_2030 === undefined) {
            return; // Exit the function early if either value is missing
        }

        // Highlight the clicked polygon
        map.setFilter('highlighted-tract', ['==', 'GEOID', e.features[0].properties.GEOID]);

        // Open a popup with information about the clicked polygon
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
            <h3>${e.features[0].properties.NAME}</h3>
            <p>
                <strong>Neighborhood:</strong> ${e.features[0].properties.NTAName}<br>
                <strong>Median GHG Intensity:</strong> ${e.features[0].properties.mdn_ghg} kgCO2e/ft2<br>
                <strong>Rent Burdened:</strong> ${e.features[0].properties.rb}% of households<br>
            </p>
        `)
            .addTo(map);

        document.getElementById('sidebar').style.display = 'block';
    });

    // Change the cursor to a pointer when
    // the mouse is over the states layer.
    map.on('mouseenter', 'map-data-tract-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change the cursor back to a pointer
    // when it leaves the states layer.
    map.on('mouseleave', 'map-data-tract-fill', () => {
        map.getCanvas().style.cursor = '';
    });


    // The 'building' layer in the Mapbox Streets
    // vector tileset contains building height data
    // from OpenStreetMap.
    map.addLayer(
        {
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#aaa',

                // Use an 'interpolate' expression to
                // add a smooth transition effect to
                // the buildings as the user zooms in.
                'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height']
                ],
                'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
            }
        }
    );






})

let currentVariable = 'qd_2024';

function changeLayer(variable) {
    // Remove shading from all buttons
    const buttons = document.querySelectorAll('.layer-button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    // Add shading to the clicked button
    const clickedButton = document.querySelector(`button[data-variable="${variable}"]`);
    clickedButton.classList.add('active');

    currentVariable = variable;
    updateMapLayer();
}


function updateMapLayer() {
    // Update the map layer based on the current variable
    map.setPaintProperty('map-data-tract-fill', 'fill-color', [
        'match',
        ['get', currentVariable],
        'stable_rentb', '#757FBD',
        'stable', '#BDC4E3',
        'atrisk', '#F89638',
        'monitor', '#F9E2B4',
        '#6e6e6e'
    ]);
}
