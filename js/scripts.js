
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

    // add a geojson source for at risk tract outlines
    map.addSource('map-atrisk-tracts', {
        type: 'geojson',
        data: 'data/map_atrisk_tracts.geojson',
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
        const atrisk = e.features[0].properties.atrisk;

        // Check if either qd_2024 or qd_2030 is missing
        if (qd_2024 === undefined || qd_2030 === undefined) {
            return; // Exit the function early if either value is missing
        }

        // Check if the clicked tract is at risk in the selected year
        if ((currentVariable === 'qd_2024' && qd_2024 === 'atrisk') ||
            (currentVariable === 'qd_2030' && qd_2030 === 'atrisk')) {

            // Zoom to the clicked tract
            map.flyTo({
                center: e.lngLat,
                zoom: 14 // Adjust zoom level as needed
            });

            // Remove the current fill layer
            map.removeLayer('map-data-tract-fill');

            // Add tract boundaries
            map.addLayer({
                id: 'map-atrisk-tracts-lines',
                type: 'line',
                source: 'map-atrisk-tracts',
                paint: {
                    'line-color': '#F89638',
                    'line-width': 0.4

                }
            })

            // Call the function to update the legend
            updateLegend('images/legend-inner.png');

            // Add the new fill layer using map_tract_bbl.geojson
            map.addLayer({
                id: 'map-data-bbl-fill',
                type: 'fill',
                source: 'map-data-bbl',
                paint: {
                    'fill-color': [ // use an expression for data-driven styling
                        'interpolate',
                        ['linear'],
                        ['get', "ghg"],
                        0,
                        '#eff3ff',
                        5,
                        '#bdd7e7',
                        10,
                        '#6baed6',
                        16.3,
                        '#2171b5'
                    ],
                    'fill-opacity': 0.9
                }
            },
                labelLayerId
            );

        } else {
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
        }
    });

    map.on('click', 'map-data-bbl-fill', (e) => {
        const bblData = map.queryRenderedFeatures(e.point, { layers: ['map-data-bbl'] });
        if (!bblData.length) {
            return; // No features found in map-data-bbl layer, exit early
        }

        // Extract relevant properties from the first feature (assuming only one feature is clicked)
        const bblProperties = bblData[0].properties;

        // Construct the HTML table dynamically
        const tableHTML = `
            <div class="header">
                <h1>New Sidebar Heading</h1>
                <h2>New Sidebar Subheading</h2>
            </div>
            <table>
                <tr>
                    <th>Property</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Property 1</td>
                    <td>${bblProperties.bbl}</td>
                </tr>
                <tr>
                    <td>Property 2</td>
                    <td>${bblProperties.property2}</td>
                </tr>
                <!-- Add more rows as needed -->
            </table>
            <button onclick="returnToPreviousMap()">Return to Previous Map</button>
        `;

        // Update the sidebar with the table
        document.getElementById('sidebar').innerHTML = tableHTML;
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
            'minzoom': 17,
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

function returnToPreviousMap() {
    // Remove the current fill layer
    map.removeLayer('map-data-bbl-fill');

    // Call the function to update the legend back to the original one
    updateLegend('images/legend.png');

    // Add back the original fill layer
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
    });

    // Zoom out to level 11
    map.flyTo({
        center: [-73.96143, 40.73941], // starting position [lng, lat]
        zoom: 11 // starting zoom
    });

    // Show the original sidebar
    document.getElementById('sidebar').style.display = 'block';

    // Update the sidebar content to the original content
    document.getElementById('sidebar').innerHTML = `
     <div class="header">
         <h1>Local Law 97 & Rent Burden</h1>
         <h2>The Clash of Energy Efficiency and Housing Affordability</h2>
     </div>
     <p>This map categorizes census tracts with <a href="https://www.nyc.gov/site/sustainablebuildings/ll97/local-law-97.page">Local Law 97</a>-covered multifamily housing buildings into quadrants by their level of rent burden and greenhouse gas emissions.</p>
     <p>While LL97 is critical to decarbonizing NYC's housing stock, tracts with both high rent burden and high emissions might be at risk of housing instability if property owners pass on compliance costs to already-burdened tenants. More information can be found in the About and Methods tabs.</p>
     <p><strong>Select a LL97 Housing Emissions Cap-Year:</strong></p>
     <button class="layer-button active" data-variable="qd_2024" onclick="changeLayer('qd_2024')">2024: 6.75 kgCO2/sqft</button>
     <button class="layer-button" data-variable="qd_2030" onclick="changeLayer('qd_2030')">2030: 3.35 kgCO2/sqft</button>
     <p>Click a <strong class="purple">purple</strong> or <strong class="yellow">yellow</strong> tract to display a pop-up, or click an <strong class="orange">orange</strong> tract for a detailed report.</p>
     <p>Alternatively, here are some notable <strong class="orange">orange</strong> tracts you can fly to:</p>
 `;
}

function updateLegend(legendImage) {
    const legendContainer = document.querySelector('.legend-container');
    const legendText = legendContainer.querySelector('.legend-text');
    const legendImg = legendContainer.querySelector('img');

    // Set the new legend image
    legendImg.src = legendImage;

    // Optionally, update legend text if needed
    // legendText.innerText = "New legend text";

    // Show the legend container
    legendContainer.style.display = 'block';
}