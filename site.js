(function(w) {
    "use strict";
    $(document).foundation();
    $(function() {
	w.voronoi.init({
	    animationDuration: 3000,
	    polygonCount: 8000,
	    voronoiHeight: 100
	});
    });
})(window);
