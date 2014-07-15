Demo here: http://mknecht.github.io/voronoi-heading/

Text is rendered on a Voronoi diagram, using D3 and Foundation. Used the visuals for my application at MixBit, but technology-wise it's about learning D3.

TODOs:

* Clean up/document the code.
* Make settings configurable via UI.
* Determine appropriate size of canvas automatically.

Limitations:

* The canvas pixels are projected directly on the diagram. No gap-filling is done. Hence the requirement that the canvas size needs to match the "resolution" of the diagram.
* Fixed font-size.

Notes

* The polygon index relies on the homogenity of the polygons, both in size and position. More specifically, its speed is based on the assumption that the diagram can be adequately rastered, using a window of the average polygon-size. That means that for each point in the canvas that is projected on the diagram, it is very likely that either the directly translated raster window will contain the target polygon, or one of its neighbors.