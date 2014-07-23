(function(w, $, d3) {
    "use strict";
    w.voronoi = {
	init: function(settings) {
	    var $w = $(w);
	    var canvasDimensions = 60;
	    var voronoiWidth = $w.width();
	    var voronoiHeight = settings.voronoiHeight;
	    var voronoiVMargin = (voronoiHeight / 10);
	    var voronoiEffectiveHeight = voronoiHeight - 2 * voronoiVMargin;
	    var voronoiPixel = (voronoiEffectiveHeight / canvasDimensions) | 0;
	    var voronoiHMargin = ((voronoiWidth % voronoiEffectiveHeight) / 2) | 0;
	    var voronoiCharDimension = voronoiEffectiveHeight;
	    var voronoiChars = (voronoiWidth / voronoiCharDimension) | 0;
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
		var baseline = 3 * ((canvasDimensions / 4) | 0);
		var ctx = $canvas[0].getContext('2d');
		ctx.font = '' + baseline + 'pt bold sans-serif';
		return {
		    drawCharacter: function(c) { ctx.fillText(c, 0, baseline); },
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
		
		path = path.data(voronoi(verticesData), polygonIdFunc);
		path.exit().remove();
		path.enter()
		    .append('path')
		    .attr("d", polygonIdFunc)
		    .attr("c", function(d, i) { return i % 8; })
		    .style("fill", function(d, i) { return colors[i % 8]; });
		path.order();

		function polygonIdFunc(d) {
		    return "M" + d.join("L") + "Z";
		}

		return {
		    fillPolygon: function(poly) {
			/** Animates a color change on every polygon that contains
			    one of the given points. */
			d3.selectAll(poly)
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
		    },
		    initFinder: function(initFunc) {
			return initFunc(path);
		    }
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
		function toVoronoiCoordAtPosition(canvasPoint) {
		    return [
			voronoiHMargin + position * voronoiCharDimension + canvasPoint[0] * voronoiPixel,
			voronoiVMargin + canvasPoint[1] * voronoiPixel
		    ];
		}
		return toVoronoiCoordAtPosition;
	    }

	    function initGridFinder(polygons) {
		var index = [];
		var rasterDim = ((voronoiWidth * voronoiHeight) / settings.polygonCount) | 0;
		var cellsPerRow = Math.ceil(voronoiWidth / rasterDim);
		var cellsPerCol = Math.ceil(voronoiHeight / rasterDim);
		function to1D(coord) {
		    return coord[0] + coord[1] * cellsPerRow
		}
		function rasterCoord(point) {
		    return [
			(Math.min(cellsPerRow, Math.max(0, (point[0] / rasterDim) | 0))),
			(Math.min(cellsPerCol, Math.max(0, (point[1] / rasterDim) | 0)))
		    ];
		}
		polygons[0].forEach(function(polygon) {
		    var arrayIdx = to1D(rasterCoord(polygon.__data__.point));
		    if (index[arrayIdx] === undefined) {
			index[arrayIdx] = [];
		    }
		    index[arrayIdx].push(polygon);
		});

		return function(point) {
		    var center = rasterCoord(point);

		    function searchInCircles(radius) {
			var foundAnyCell;
			var hLen = radius * 2 + 1;
			var vLen = radius * 2 - 1;
			var numCells = 2 * hLen + 2 * vLen;
			var polygonlists = d3.range(numCells).map(function(d) {
			    var x = 0, y = 0;
			    if (d < hLen) {
				x = d - radius;
				y = -radius;
			    } else if (d < hLen + vLen) {
				x = -radius;
				y = d - (hLen + radius) + 1;
			    } else if (d < hLen + vLen * 2) {
				x = radius;
				y = d - (hLen + vLen + radius) + 1;
			    } else {
				x = d - (hLen + vLen * 2 + radius);
				y = radius;
			    }
			    return [center[0] + x, center[1] + y];
			}).filter(function(coord) {
			    return (
				coord[0] >= 0 && coord[0] < cellsPerRow
				&& coord[1] >= 0 && coord[1] < cellsPerCol
			    );
			}).map(function(coord) {
			    return index[to1D(coord)];
			}).filter(function(polygonlist) {
			    return polygonlist !== undefined;
			});
			foundAnyCell = polygonlists.length > 0;
			result = polygonlists.map(function(polygonlist) {
			    return polygonlist.filter(function(polygon) {
				return d3.geom.polygon(polygon.__data__).contains(point);
			    });
			}).filter(function(polygonlist) {
			    return polygonlist.length !== 0;
			});
			if (!foundAnyCell) {
			    return [];
			}
			if (result.length > 0) {
			    return result[0];
			}
			return searchInCircles(radius + 1);
		    };

		    var result = [index[to1D(center)]]
			.filter(function(polygonlist) {
			    return polygonlist !== undefined
			}).map(function(polygonlist) {
			    return polygonlist.filter(function(polygon) {
				return d3.geom.polygon(polygon.__data__).contains(point);
			    });
			}).filter(function(polygonlist) {
			    return polygonlist.length > 0;
			});

		    if (result.length > 0) {
			return result[0];
		    } else {
			return searchInCircles(1);
		    }
		}
	    }

	    function initCanvasMappingFinder(polygons) {
		var polyobj;
		var indexedPolygons = [undefined];
		$('canvas#polygonmap')
		    .width(voronoiWidth)
		    .height(voronoiHeight)
		    .attr("height", voronoiHeight)
		    .attr("width", voronoiWidth)
		    .show();
		var gridFinder = initGridFinder(polygons);
		function color2index(color) {
		    return (
			((color[0] ^ 255) << 0)
			    + (((color[1] ^ 255) & 255) << 8)
			    + (((color[2] ^ 255) & 255) << 16)
			    + (((color[3] ^ 255) & 255) << 24)
		    );
		}
		function index2color(index) {
		    return [
			((index >> 0) ^ 255)  & 255,
			((index >> 8) ^ 255) & 255,
			((index >> 16) ^ 255) & 255,
			((index >> 24) ^ 255) & 255
		    ];
		}

		var ctx = $('canvas#polygonmap')[0].getContext("2d");
		var image_data = ctx.createImageData(1, 1);
		d3.range(5, voronoiWidth - 5).forEach(function(x) {
		    d3.range(5, voronoiHeight - 5).forEach(function(y) {
			var idx;
			var polys = gridFinder([x, y]);
			if (polys.length === 0) {
			    idx = 0;
			} else {
			    polyobj = d3.select(polys[0])
			    // Voronoi polygons are non-overlapping.
			    if (polyobj.attr("ci") === null) {
				polyobj.attr("ci", indexedPolygons.length);
			    }
			    var idx = polyobj.attr("ci");
			    indexedPolygons[idx] = polys[0];
			}
			var color = index2color(idx);
			image_data.data[0] = color[0];
			image_data.data[1] = color[1];
			image_data.data[2] = color[2];
			image_data.data[3] = color[3];
			ctx.putImageData(image_data, x, y);
		    });
		});
		return function(point) {
		    var color = ctx.getImageData(point[0], point[1], 1, 1).data;
		    var idx = color2index(color);
		    return [indexedPolygons[idx]];
		};
	    }

	    function setFinder(newFinder) {
		finder[0] = voronoiOps.initFinder(
		    (newFinder == 'mappingcanvas') ? initCanvasMappingFinder : initGridFinder);
	    };

	    var voronoiOps = initVoronoiRect();
	    var finder = [];
	    var canvas = initCanvas($('canvas#raster'));
	    initTextfield(
		function() { canvas.clear(); },
		function(c) { 
		    canvas.clear();
		    canvas.drawCharacter(c);
		    rasterCanvas().map(toVoronoiCoord($('input').getCursorPosition())).forEach(function(point) { voronoiOps.fillPolygon(finder[0](point)); });
		}
	    );
	    setFinder(settings.finder);
	    return setFinder;
	}
    }
})(window, jQuery, d3);
