(function(w) {
    "use strict";
    $(function() {
	$(document).foundation();
	var finderSelector = w.voronoi.init({
	    animationDuration: 3000,
	    finder: $('find-algorithm[checked=checked]').val(),
	    polygonCount: 8000,
	    voronoiHeight: 100
	});
	$("input[name='find-algorithm']").click(function(e) {
	    finderSelector($(this).val());
	});
	$('input#headingtext').focus();
    });
})(window);
