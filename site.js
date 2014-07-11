/** Modified gist from Mike Bostock: http://bl.ocks.org/mbostock/4060366 */
(function(w, $, d3) {
    "use strict";
    $(function() {
	var $w = $(w);

	d3.geom.polygon.prototype.contains = function (point) {
	    // function from https://github.com/substack/point-in-polygon
	    // James Halliday, MIT license
	    // ---
	    // ray-casting algorithm based on
	    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
	    
	    var x = point[0];
	    var y = point[1];
	    
	    var inside = false;
	    for (var i = 0, j = this.length - 1; i < this.length; j = i++) {
		var xi = this[i][0], yi = this[i][1];
		var xj = this[j][0], yj = this[j][1];
		
		var intersect = ((yi > y) != (yj > y))
		    && (x < ((xj - xi) * (y - yi) / (yj - yi) + xi));
		if (intersect) inside = !inside;
	    }
	    return inside;
	};

	function initCanvas() {
	    var canvas = $('canvas');
	    var dimensions = 20;
	    canvas
		.width(dimensions)
		.height(dimensions)
		.attr('width', dimensions)
		.attr('height', dimensions);
	    var ctx = canvas[0].getContext('2d');
	    ctx.font = '15pt bold sans-serif';
	    $('input').keypress(function(e) {
		if (e.which === 13) {
		    $(this).val('');
		    ctx.clearRect(0, 0, dimensions, dimensions);
		}
		if (e.which > 32) {
		    ctx.clearRect(0, 0, dimensions, dimensions);
		    ctx.fillText(e.key, 0, 15);
		}
	    });
;
	};

	function initVoronoiRect() {
	    var width = $w.width();
	    var height = 200;
	    var colors = [
		'rgb(197,27,125)',
		'rgb(222,119,174)',
		'rgb(241,182,218)',
		'rgb(253,224,239)',
		'rgb(230,245,208)',
		'rgb(184,225,134)',
		'rgb(127,188,65)',
		'rgb(77,146,33)'
	    ]

	    var existingVertices = d3.set();
	    var verticesData = d3.range(500).map(function() {
		var vertex;
		while (existingVertices.has(vertex = [Math.random() * width, Math.random() * height])) {
		}
		existingVertices.add(vertex)
		return vertex;
	    });
	    var c = d3.scale.category10();
	    var voronoiFunc = d3.geom.voronoi().clipExtent([0, 0], [width, height]);
	    function voronoi(data) {
		// Voronoi function always produces one polygon
		// on the right border
		// with a vertex [undefined, NaN], which messes up the
		// contains-calculation.
		// Here, we get rid of it.
		return voronoiFunc(data).filter(function(p) {
		    return p.every(function(v) {
			return (
			    v[0] !== undefined && v[0] !== NaN
				&& v[1] !== undefined && v[1] !== NaN
			);
		    });
		});
	    }
	    var svg = d3.select('div#voronoi')
		.append('svg')
		.attr('width', width)
		.attr('height', height)
	    ;
	    var path = svg.append('g').selectAll('path');
	    
	    path = path.data(voronoi(verticesData), polygon);
	    path.exit().remove();
	    path.enter()
		.append('path')
		.attr("d", polygon)
		.attr("c", function(d, i) { return i % 8; })
		.style("fill", function(d, i) { return colors[i % 8]; });
	    path.order();

	    function polygon(d) {
		return "M" + d.join("L") + "Z";
	    }

	    return function(points) {
		var filtered = path.filter(function(d, i) {
		    return points.filter(function(point) {
			return d3.geom.polygon(d).contains(point);
		    }).length != 0;
		});
		filtered
		    .transition()
		    .duration(1500)
		    .styleTween(
			"fill",
			function(d) {
			    return d3.interpolateRgb(
				"black",
				// We don't return to the original color.
				// We'd need to store it — one animation
				// could be started in the middle of another.
				// So, I don't care.
				colors[parseInt(Math.random() * colors.length)]
			    );
			}
		    );
	    }
	}

	var fillPolygons = initVoronoiRect();
	initCanvas();
	fillPolygons([
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200],
	    [Math.random() * $w.width(), Math.random() * 200]
	]);
    });
})(window, jQuery, d3);
