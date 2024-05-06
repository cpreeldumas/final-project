
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

    // add a geojson source for choropleth
    map.addSource('map-data-tract', {
        type: 'geojson',
        data: 'data/map_data_tract.geojson',
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

        // Highlight the clicked polygon
        map.setFilter('highlighted-tract', ['==', 'GEOID', e.features[0].properties.GEOID]);

        // Open a popup with information about the clicked polygon
        /*new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
            <h3>${e.features[0].properties.GEOID}</h3>
            <p>
                <strong>Median GHG Intensity:</strong> ${e.features[0].properties.mdn_ghg} kgCO2e/ft2<br>
                <strong>Rent Burden:</strong> Median rent is ${e.features[0].properties.rntbrdE} % of household income <br>
            </p>
        `)
            .addTo(map);
        */

        // Populate the table with data specific to the clicked polygon
        const tableData = {
            "Census Tract": e.features[0].properties.GEOID,
            "Median GHG Intensity": `${e.features[0].properties.mdn_ghg} kgCO2e/ft2`,
            "Rent Burden": `Median rent is ${e.features[0].properties.mdrntnE}% of household income`
        };

        const table = document.getElementById('data-table');

        table.innerHTML = '';

        for (const [key, value] of Object.entries(tableData)) {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.textContent = key;
            cell2.textContent = value;

            // Add borders to table cells
            cell1.style.border = '1px solid #ccc';
            cell2.style.border = '1px solid #ccc';
            cell1.style.padding = '8px';
            cell2.style.padding = '8px';
        }

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

// Fly to Random "At Risk" Tract
/*function flyToRandomRisk() {
    // Filter features based on the "risk" category
    const riskFeatures = map.querySourceFeatures('map-data-tract', {
        filter: ['==', ['get', 'qd_2024'], 'disadvantaged']
    });

    // Check if there are any features in the "risk" category
    if (riskFeatures.length > 0) {
        // Randomly select one feature from the filtered list
        const randomFeature = riskFeatures[Math.floor(Math.random() * riskFeatures.length)];

        // Fly the map to the selected feature
        map.flyTo({
            center: randomFeature.geometry.coordinates[0][0], // Adjust the coordinates if needed
            zoom: 14, // Adjust the zoom level as desired
            essential: true // ensures the flyTo animation is smooth
        });
    } else {
        console.log("No census tracts found in the 'risk' category.");
    }
}
*/