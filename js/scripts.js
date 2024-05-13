function openMethodsPopup() {
    document.getElementById("nav-methods-popup").style.display = "block";
    document.getElementById("nav-popup-overlay").style.display = "block";
}

function closeMethodsPopup() {
    document.getElementById("nav-methods-popup").style.display = "none";
    document.getElementById("nav-popup-overlay").style.display = "none";
}

mapboxgl.accessToken = 'pk.eyJ1IjoiY3ByZWVsZHVtYXMiLCJhIjoiY2x1bHZ0dGJ0MGw4bTJpbGxwdm5jZmQ4cyJ9.ZusuHjH6O73kH4F2RmenWA';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11', // dark basemap
    center: [-73.97997, 40.72062], // starting position [lng, lat]
    zoom: 10, // starting zoom
});


map.addControl(new mapboxgl.NavigationControl());



// when the map is finished it's initial load, add sources and layers.
map.on('load', function () {

    // Identify layers for place, street, airports, parks, and landmarks labels
    const mbLayers = map.getStyle().layers;
    const labelLayers = mbLayers.filter(layer => {
        return layer.type === 'symbol' && (
            layer['source-layer'] === 'place_label' ||
            layer['source-layer'] === 'road' ||
            layer['source-layer'] === 'airport_label' ||
            layer['source-layer'] === 'poi_label' ||
            layer['source-layer'] === 'park_label'
        );
    });

    // Remove stroke from the label layers and make labels white
    labelLayers.forEach(layer => {
        map.setPaintProperty(layer.id, 'text-color', '#FFFFFF');
        map.setPaintProperty(layer.id, 'text-halo-color', 'rgba(0, 0, 0, 0)'); // Remove stroke
    });

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


    // first add the fill layer, using a match expression to give each a color based on its quadrant property
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
    },
        labelLayerId
    )

    // Add a layer for highlighting the clicked AT RISK tract polygon, initially invisible
    map.addLayer({
        id: 'highlighted-tract-atrisk',
        type: 'line',
        source: 'map-data-tract',
        paint: {
            'line-color': '#F89638',
            'line-width': 3,
            'line-opacity': 0.8,
            'line-blur': 0.3
        },
        filter: ['==', 'GEOID', ''] // Initially filter to none
    },
        labelLayerId
    );

    // Add a layer for highlighting the clicked tract polygon, initially invisible
    map.addLayer({
        id: 'highlighted-tract',
        type: 'line',
        source: 'map-data-tract',
        paint: {
            'line-color': 'white',
            'line-width': 2,
            'line-opacity': 0.9,
            'line-blur': 0.1
        },
        filter: ['==', 'GEOID', ''] // Initially filter to none
    },
        labelLayerId
    );

    // Add a layer for highlighting the clicked bbl polygon, initially invisible
    map.addLayer({
        id: 'highlighted-bbl',
        type: 'line',
        source: 'map-data-bbl',
        paint: {
            'line-color': 'white',
            'line-width': 2,
            'line-opacity': 0.8,
            'line-blur': 0.3
        },
        filter: ['==', 'bbl', ''] // Initially filter to none
    });

    // Add a layer for bbl choropleth, initially invisible
    map.addLayer({
        id: 'map-data-bbl-fill',
        type: 'fill',
        source: 'map-data-bbl',
        layout: { 'visibility': 'none' }, // initially invisible
        paint: {
            'fill-color': [ // use an expression for data-driven styling
                'interpolate',
                ['linear'],
                ['get', "ghg"],
                0,
                '#52BA4F',
                3.3,
                '#9AD798',
                6.6,
                '#E7EBC5',
                9.9,
                '#F6998C',
                13.3,
                '#F47266',
                16.3,
                '#F15B52'
            ],
            'fill-opacity': 0.9
        }
    },
        labelLayerId
    );

    // Add a layer for atrisk tract boundaries, initially invisible
    map.addLayer({
        id: 'map-atrisk-tracts-lines',
        type: 'line',
        source: 'map-atrisk-tracts',
        layout: { 'visibility': 'none' }, // initially invisible
        paint: {
            'line-color': '#F89638',
            'line-width': 0.4

        }
    },
        labelLayerId
    )

    // When a click event occurs on a orange tract in the map-data-tract-fill layer,
    // zoom to the location of the click and show new bbl layer, update sidebar
    // otherwise, open a popup
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
                zoom: 15 // Adjust zoom level as needed
            });

            // Make the tract fill layer invisible
            map.setLayoutProperty('map-data-tract-fill', 'visibility', 'none'),

            // Make the highlighted tract layer invisible
            map.setLayoutProperty('highlighted-tract', 'visibility', 'none'),

            // Add tract boundaries
            map.setLayoutProperty('map-atrisk-tracts-lines', 'visibility', 'visible'),

            // Highlight the clicked tract line
            map.setLayoutProperty('highlighted-tract-atrisk', 'visibility', 'visible'),
            map.setFilter('highlighted-tract-atrisk', ['==', 'GEOID', e.features[0].properties.GEOID]);

            // Call the function to update the legend
            updateLegend('images/legend-inner.png');

            // Show the new bbl choropleth fill layer
            map.setLayoutProperty('map-data-bbl-fill', 'visibility', 'visible'),

            // Update the sidebar content
            document.getElementById('sidebar').innerHTML = `
            <div class="header">
                <h1>Property Lot View</h1>
                <h2>Showing LL97-Covered Multifamily Housing Lots in High Rent Burden & High Emission Tracts</h2>
            </div>
            <p>
                You are in <strong class="orange">${e.features[0].properties.NAME}</strong>,<br>
                <strong>Click a property lot to display its data report below:</strong>
            </p>
            <p></p>
            <button class ="button-4" onclick="returnToPreviousMap()">Return to Previous Tract-Level Map</button>
        `;

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

    // when a click event occurs on bbl fill, display new sidebar with road view, compliance message, and table
    map.on('click', 'map-data-bbl-fill', (e) => {
        const bblData = map.queryRenderedFeatures(e.point, { layers: ['map-data-bbl-fill'] });
        if (!bblData.length) {
            return; // No features found in map-data-bbl layer, exit early
        }

        // Hide any previously highlighted tract boundary layer
        map.setLayoutProperty('highlighted-tract', 'visibility', 'none'),

        // Highlight the tract boundary where the clicked bbl is located
        map.setLayoutProperty('highlighted-tract-atrisk', 'visibility', 'visible'),
        map.setFilter('highlighted-tract-atrisk', ['==', 'GEOID', bblData[0].properties.GEOID]);

        // Highlight the clicked bbl polygon
        map.setLayoutProperty('highlighted-bbl', 'visibility', 'visible'),
        map.setFilter('highlighted-bbl', ['==', 'bbl', e.features[0].properties.bbl]);

        // Extract relevant properties from the first feature (assuming only one feature is clicked)
        const bblProperties = bblData[0].properties;

        // Extract longitude and latitude from the clicked feature
        const lng = bblData[0].properties.lng;
        const lat = bblData[0].properties.lat;

        // Construct the road view URL with the extracted coordinates
        const roadViewURL = `https://roadview.planninglabs.nyc/view/${lng}/${lat}`;

        // Construct the HTML for the road view element
        const roadViewHTML = `
        <div class="road-view">
            <iframe src="${roadViewURL}" width="100%" height="400px"></iframe>
        </div>
        `;

        // Determine compliance message based on GHG value
        let complianceMessage = "";
        if (bblProperties.ghg < 3.35) {
            complianceMessage = "It is compliant under <strong>both the 2024 cap and 2030 cap.</strong>";
        } else if (bblProperties.ghg < 6.75) {
            complianceMessage = "It is compliant under <strong>only the 2024 cap, and will become noncompliant in 2030.</strong>";
        } else {
            complianceMessage = "It is noncompliant under <strong>both the 2024 and 2030 caps.</strong>";
        }

        // Construct the HTML table dynamically
        const tableHTML = `
            <div class="header">
                <h1>Property Lot View</h1>
                <p>
                    Your Selection:<br>
                    <strong>Lot Address:</strong>  ${bblProperties.addrss_}, ${bblProperties.BoroNam}<br>
                    <strong>Neighborhood:</strong> ${bblProperties.NTAName}<br>
                    ${e.features[0].properties.NAME}
                </p>
            ${roadViewHTML} <!-- Add roadViewHTML here -->
                <p>This lot's GHG Intensity is <b>${bblProperties.pct_df_}%</b> of the city average for multifamily housing. ${complianceMessage}</p>
            </div>
            <div style="background-color: #FEEBC8; border-radius: 10px; padding: 4px;">
                <table style="border-collapse: collapse;">
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;"><b>GHG Intensity:</b></td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;"><b>${bblProperties.ghg} kgCO2/sqft</b></td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Energy Star Score:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">${bblProperties.ess} out of 100</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Residential Units:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">${bblProperties.unts_rs}</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Year Built:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">${bblProperties.year}</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Square Feet:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">${numeral(bblProperties.gfa_chr).format('0,0')}</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Tract Rent-Burdened:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">${bblProperties.rb_c}%</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Tract Median Rent:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">$${bblProperties.mdrntE_}</td>
                    </tr>
                    <tr>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">Tract Median Income:</td>
                        <td style="width: 200px; border-bottom: 1px solid #F89638; padding: 2px; font-size: smaller;">$${bblProperties.mdncmE_}</td>
                    </tr>
                </table>
            </div>
            <p></p>
            <p>Are you the building owner? Get resources and guidance on decarbonization at <a
            href="https://accelerator.nyc/">NYC Accelerator</a>.</p>
            <button class ="button-4" onclick="returnToPreviousMap()">Return to Previous Map</button>
        `;

        // Update the sidebar
        document.getElementById('sidebar').innerHTML = tableHTML;
    });


    // Change the cursor to a pointer when
    // the mouse is over the tract layer.
    map.on('mouseenter', 'map-data-tract-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change the cursor back to a pointer
    // when it leaves the tract layer.
    map.on('mouseleave', 'map-data-tract-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Change the cursor to a pointer when
    // the mouse is over the bbl layer.
    map.on('mouseenter', 'map-data-bbl-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change the cursor back to a pointer
    // when it leaves the tract layer.
    map.on('mouseleave', 'map-data-bbl-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // ADD 3D Buildings
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

// function to update active year button
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

// function to change year layer based on button click
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

// function to return to previous map when in BBL view
function returnToPreviousMap() {
    // Hide bbl-level layers
    map.setLayoutProperty('map-data-bbl-fill', 'visibility', 'none'),
    map.setLayoutProperty('borough-boundaries-line', 'visibility', 'none'),
    map.setLayoutProperty('map-atrisk-tracts-lines', 'visibility', 'none'),
    map.setLayoutProperty('highlighted-tract-atrisk', 'visibility', 'none'),
    map.setLayoutProperty('highlighted-bbl', 'visibility', 'none'),

    // Call the function to update the legend back to the original one
    updateLegend('images/legend.png');

    // Always start at 2024 year
    currentVariable = 'qd_2024';
    updateMapLayer();

    // Create LabelLayerID for 3D Buildings
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
    ).id;

    // Add back the original fill layer
    map.setLayoutProperty('map-data-tract-fill', 'visibility', 'visible'),

    // add borough outlines after the fill layer, so the outline is "on top" of the fill
    map.setLayoutProperty('borough-boundaries-line', 'visibility', 'visible'),

    // Add a layer for highlighting the clicked tract polygon
    map.setLayoutProperty('highlighted-tract', 'visibility', 'visible'),

    // Zoom out to level 11
    map.flyTo({
            center: [-73.97997, 40.72062], // starting position [lng, lat]
            zoom: 10 // starting zoom
    });

    // Show the original sidebar
    document.getElementById('sidebar').style.display = 'block';

    // Update the sidebar content to the original content
    document.getElementById('sidebar').innerHTML = `
                <div class="header">
                    <h1>NYC Local Law 97 & Rent Burden</h1>
                </div>

                <p>This map categorizes census tracts with housing covered by Local Law 97 (LL97) by their level of rent burden and median greenhouse gas emissions, and lets you explore tracts that are both highly rent-burdened and emitting above the law's cap.</p>

                <div class="accordion" id="sidebarAccordion">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                                <strong>Why is this important?</strong>
                            </button>
                        </h2>
                        <div id="collapseOne" class="accordion-collapse collapse"
                            data-bs-parent="#sidebarAccordion">
                            <div class="accordion-body">
                                In 2019, NYC enacted <a
                                    href="https://www.nyc.gov/site/sustainablebuildings/ll97/local-law-97.page">LL97</a> to reduce carbon emissions by phasing in carbon caps through 2050, with fines for
                                non-compliant buildings. While LL97 is critical to decarbonizing NYC, some fear its
                                effects on
                                housing affordability. Owners of high-emission housing may pass on the cost of cutting
                                emissions to
                                tenants through higher rents and fees. Areas where tenants are already highly
                                rent-burdened could
                                experience housing instability if tenants are then priced out and forced to move.
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                                data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                                <strong>What does this map do?</strong>
                            </button>
                        </h2>
                        <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#sidebarAccordion">
                            <div class="accordion-body">
                                Census tracts are categorized into quadrants by whether the majority of tenants are rent-burdened and whether the median Greenhouse Gas Intensity among multifamily housing buildings is above the law's cap. Housing in <strong class="orange">orange</strong> tracts is both highly rent burdened and emitting above the carbon cap on average, indicating areas where additional support and resources might be needed. Since LL97 phases in more stringent caps over time, you can view the map under either the current 2024 carbon-cap or the upcoming 2030 carbon-cap. 
                            </div>
                        </div>
                    </div>
                </div>

                <p></p>
                <p> <strong>Select a LL97 Housing Carbon-Cap-Year:</strong> </p>
                <button class="layer-button active" data-variable="qd_2024"
                    onclick="changeLayer('qd_2024')"><strong>2024:</strong> 6.75 kgCO2/sqft</button>
                <button class="layer-button" data-variable="qd_2030"
                    onclick="changeLayer('qd_2030')"><strong>2030:</strong> 3.35 kgCO2/sqft</button>
                <p></p>
                <p>Click a <strong class="purple">purple</strong> or <strong class="yellow">yellow</strong> tract to
                    display a pop-up, or <strong>click an <strong class="orange">orange</strong> tract</strong> to see
                    to see more detail on the buildings and emissions in that tract.</p>
            </div>
 `;

    // Move the highlighted tract layer above the fill layer
    map.moveLayer('map-data-tract-fill', 'borough-boundaries-line', 'highlighted-tract');

    // Reset the filter for the highlighted tract layer
    map.setFilter('highlighted-tract', ['==', 'GEOID', '']);
}

// Update legend function
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

// add popovers
const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl))
