# Local Law 97 & Rent Burden Map

This repository contains the HTML, JavaScript, and CSS code behind the [LL97 & Rent Burden Map](https://cpreeldumas.github.io/final-project/), an interactive web map of NYC census tracts with [Local Law 97](https://www.nyc.gov/site/sustainablebuildings/ll97/local-law-97.page)-covered multifamily housing buildings categorized into four quadrants by their level of rent burden and greenhouse gas emissions.

The map relies on data analysis of the EPA's latest [Energy and Water Data Disclosure for Local Law 84](https://data.cityofnewyork.us/Environment/Energy-and-Water-Data-Disclosure-for-Local-Law-84-/7x5e-2fxh/about_data) and the 2022 5-Year American Community Survey. More details on the analysis and methods can be found in the Data & Methods tab of the map.

# Map Home View
Users land on a map of color-coded NYC Census tracts and can read about the background and purpose of this map in the sidebar. The map can be toggled to show the quadrant categorization under either current 2024 emission caps or the upcoming 2030 cap. The map lets users zoom, pan, and explore the census tracts. 

![Screenshot 2024-05-12 at 8 29 16 PM](https://github.com/cpreeldumas/final-project/assets/52207575/4ce2ce4c-5c6c-40ca-90e7-3bb3b7f3958d)

# Map Interactivity
When a user clicks on an orange tract (categorized as both highly rent-burdened and high emissions), the map zooms into the area and displays building-level polygons for multifamily housing buildings in the tract. Users can then click on any building and see its data in the sidebar, including a street view, a summary of its compliance under LL97, and detailed data on emissions and rent burden at the property level. These update dynamically based on the building selection.

![Screenshot 2024-05-12 at 8 38 24 PM](https://github.com/cpreeldumas/final-project/assets/52207575/1acf358e-ec13-4470-a586-8368598831a9)

If users zoom in closely, 3D Buildings become visible:

![Screenshot 2024-05-12 at 8 42 56 PM](https://github.com/cpreeldumas/final-project/assets/52207575/a06835dc-ec21-4a76-ab79-d836d094bdb9)

Please visit the Data & Methods page of the map for more information:
![Screenshot 2024-05-12 at 8 39 21 PM](https://github.com/cpreeldumas/final-project/assets/52207575/83aa75f4-1642-4cf7-a6d8-2df334164b74)
