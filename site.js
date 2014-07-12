/** Modified gist from Mike Bostock: http://bl.ocks.org/mbostock/4060366 */
(function(w, $, d3, settings) {
    "use strict";
    $(function() {
	var $w = $(w);
	var canvasDimensions = 20;
	var voronoiHeight = settings.voronoiHeight;
	var voronoiVMargin = (voronoiHeight / 10);
	var voronoiEffectiveHeight = voronoiHeight - 2 * voronoiVMargin;
	var voronoiPixel = (voronoiEffectiveHeight / canvasDimensions) | 0;
	var voronoiHMargin = (($w.width() % voronoiEffectiveHeight) / 2) | 0;
	var voronoiCharDimension = voronoiEffectiveHeight;
	var voronoiChars = ($w.width() / voronoiCharDimension) | 0;
	$('span#numchars').text(voronoiChars);

	(function($) {
	    $.fn.getCursorPosition = function() {
		var input = this.get(0);
		if (!input) return; // No (input) element found
		if ('selectionStart' in input) {
		    // Standard-compliant browsers
		    return input.selectionStart;
		} else if (document.selection) {
		    // IE
		    input.focus();
		    var sel = document.selection.createRange();
		    var selLen = document.selection.createRange().text.length;
		    sel.moveStart('character', -input.value.length);
		    return sel.text.length - selLen;
		}
	    }
	})($);

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

	function initCanvas($canvas) {
	    var dimensions = canvasDimensions;
	    $canvas
		.width(dimensions)
		.height(dimensions)
		.attr('width', dimensions)
		.attr('height', dimensions);
	    var ctx = $canvas[0].getContext('2d');
	    ctx.font = '15pt bold sans-serif';
	    return {
		drawCharacter: function(c) { ctx.fillText(c, 0, 15); },
		clear: function() { ctx.clearRect(0, 0, dimensions, dimensions); }
	    }
	};

	function initVoronoiRect() {
	    var width = $w.width();
	    var height = voronoiHeight;
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
	    var verticesData = d3.range(settings.polygonCount).map(function() {
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

	    return function(point) {
		/** Animates a color change on every polygon that contains
		    one of the given points. */
		path
		    .filter(function(d, i) {
			return d3.geom.polygon(d).contains(point);
		    })
		    .transition()
		    .duration(settings.animationDuration)
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

	function initTextfield(resetFunc, newCharacterFunc) {
	    $('input')
		.attr('maxLength', voronoiChars)
		.keypress(function(e) {
		    if (e.which === 13) {
			$(this).val('');
			resetFunc()
		    }
		    if (e.which > 32) {
			newCharacterFunc(String.fromCharCode(e.which));
		    }
		});
	}

	function rasterCanvas() {
	    var x,y;
	    var points = [];
	    var $canvas = $('canvas#raster');
	    var ctx = $canvas[0].getContext('2d');
	    var imgData = ctx.getImageData(0, 0, canvasDimensions, canvasDimensions);
	    for (var i = 0; i < imgData.data.length; i += 4) {
		if (imgData.data[i + 3] > 0 && imgData.data[i] < 255) {
		    // Text is black, so testing one component suffices.
		    points.push([
			Math.floor(Math.floor(i/4) % imgData.width),
			Math.floor(Math.floor(i/4) / imgData.height)
		    ]);
		}
	    }
	    return points;
	}

	function toVoronoiCoord(position) {
	    console.log(position);
	    function toVoronoiCoordAtPosition(canvasPoint) {
		return [
		    voronoiHMargin + position * voronoiCharDimension + canvasPoint[0] * voronoiPixel,
		    voronoiVMargin + canvasPoint[1] * voronoiPixel
		];
	    }
	    return toVoronoiCoordAtPosition;
	}
	function drawCircleAtPoints(points) {
	    d3.select('svg').selectAll('circle')
		.data(points)
		.enter().append('circle')
		.attr('cx', function(d) { return d[0]; })
		.attr('cy', function(d) { return d[1]; })
		.attr('r', 1)
		.attr('fill', 'transparent')
		.attr('stroke', 'blue');
	}
	var fillPolygonAtPoint = initVoronoiRect();
	var canvas = initCanvas($('canvas#raster'));
	initTextfield(
	    function() { canvas.clear(); },
	    function(c) { 
		canvas.clear();
		canvas.drawCharacter(c);
		rasterCanvas().map(toVoronoiCoord($('input').getCursorPosition())).forEach(fillPolygonAtPoint);
	    }
	);
	$('input').focus();
    });
})(window, jQuery, d3, {
    animationDuration: 3000,
    polygonCount: 8000,
    voronoiHeight: 100
});
