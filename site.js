(function(w) {
    "use strict";
    $(document).foundation();
    $(function() {
	w.voronoi.init({
	    animationDuration: 4000,
	    polygonCount: 6000,
	    voronoiHeight: 100
	});
    });
})(window);
